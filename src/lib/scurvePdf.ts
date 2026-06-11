import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { CellHookData } from "jspdf-autotable";
import { Project, PrintSettings } from "@/types";
import {
  renderPdfHeader,
  renderPdfSignatories,
  getSignatoriesReserveMm,
} from "./printSettings";
import { sanitizeAutoTableCell, sanitizePdfText } from "./pdfText";
import { formatCurrency } from "./calculations";

export interface SCurveRenderOptions {
  totalDuration: number;
  intervalDays: number;
  monthDays: number;
  scheduleData: Record<string, Array<{ from: number; to: number }>>;
}

interface CategoryRow {
  id: string;
  itemNo: string;
  description: string;
  cost: number;
  weightPercent: number;
  ranges: Array<{ from: number; to: number }>;
}

interface ComputedData {
  rows: CategoryRow[];
  columns: number[];
  monthGroups: Array<{ label: string; span: number; startCol: number }>;
  columnWeights: number[];
  cumulativeProgress: number[];
  monthlyAccPct: number[];
  monthlyAccCost: number[];
  cumAccPct: number[];
  cumAccCost: number[];
  grandTotal: number;
}

const COLORS: Array<[number, number, number]> = [
  [255, 215, 0], [50, 205, 50], [65, 105, 225], [255, 140, 0],
  [147, 112, 219], [32, 178, 170], [255, 99, 71], [112, 128, 144],
];

function getDescendantCost(project: Project, itemId: string): number {
  const children = project.abcItems.filter((i) => i.parentId === itemId);
  let sum = 0;
  for (const c of children) {
    sum += c.isCategory ? getDescendantCost(project, c.id) : c.totalCost;
  }
  return sum;
}

function computeData(project: Project, opts: SCurveRenderOptions): ComputedData {
  const { totalDuration, intervalDays, monthDays, scheduleData } = opts;

  const tops = project.abcItems.filter((i) => i.isCategory && !i.parentId);
  const categories = tops.map((cat) => {
    const c = getDescendantCost(project, cat.id);
    return { ...cat, totalCost: c > 0 ? c : cat.totalCost };
  });
  const grandTotal = categories.reduce((s, c) => s + c.totalCost, 0);

  const rows: CategoryRow[] = grandTotal === 0 ? [] : categories.map((cat) => ({
    id: cat.id,
    itemNo: cat.itemNo,
    description: cat.description,
    cost: cat.totalCost,
    weightPercent: Math.round((cat.totalCost / grandTotal) * 10000) / 100,
    ranges: scheduleData[cat.id] || [],
  }));

  const columns: number[] = [];
  for (let i = intervalDays; i <= totalDuration; i += intervalDays) columns.push(i);
  if (columns.length === 0 || columns[columns.length - 1] < totalDuration) columns.push(totalDuration);

  const monthGroups: ComputedData["monthGroups"] = [];
  let monthStart = 0;
  let colIdx = 0;
  while (colIdx < columns.length) {
    const monthEnd = monthStart + monthDays;
    let span = 0;
    const startCol = colIdx;
    while (colIdx < columns.length && columns[colIdx] <= monthEnd) {
      span++; colIdx++;
    }
    if (span > 0) monthGroups.push({ label: `${monthDays} Calendar Days`, span, startCol });
    monthStart = monthEnd;
  }

  const isDayActive = (ranges: Array<{ from: number; to: number }>, day: number) =>
    ranges.some((r) => day >= r.from && day < r.to);

  const colWeights: number[] = columns.map(() => 0);
  rows.forEach((row) => {
    const activeDays = row.ranges.reduce((s, r) => s + Math.max(0, r.to - r.from), 0);
    if (activeDays <= 0) return;
    columns.forEach((colDay, ci) => {
      const prevCol = ci === 0 ? 0 : columns[ci - 1];
      let active = 0;
      for (let d = prevCol; d < colDay; d++) if (isDayActive(row.ranges, d)) active++;
      if (active > 0) colWeights[ci] += row.weightPercent * (active / activeDays);
    });
  });

  const cumulative: number[] = [];
  let cum = 0;
  colWeights.forEach((w) => { cum += w; cumulative.push(Math.round(Math.min(cum, 100) * 100) / 100); });

  const mAccPct = monthGroups.map((mg) => {
    let s = 0;
    for (let c = mg.startCol; c < mg.startCol + mg.span; c++) s += colWeights[c] || 0;
    return Math.round(s * 100) / 100;
  });
  const mAccCost = mAccPct.map((p) => Math.round((grandTotal * p / 100) * 100) / 100);
  const cAccPct: number[] = [];
  const cAccCost: number[] = [];
  let cAcc = 0; let cAccPhp = 0;
  mAccPct.forEach((m, i) => {
    cAcc += m; cAccPhp += mAccCost[i] || 0;
    cAccPct.push(Math.round(Math.min(cAcc, 100) * 100) / 100);
    cAccCost.push(Math.round(Math.min(cAccPhp, grandTotal) * 100) / 100);
  });

  return {
    rows, columns, monthGroups,
    columnWeights: colWeights.map((w) => Math.round(w * 100) / 100),
    cumulativeProgress: cumulative,
    monthlyAccPct: mAccPct, monthlyAccCost: mAccCost,
    cumAccPct: cAccPct, cumAccCost: cAccCost, grandTotal,
  };
}

export function renderSCurvePdf(
  project: Project,
  settings: PrintSettings,
  opts: SCurveRenderOptions,
  title: string,
): jsPDF {
  const data = computeData(project, opts);

  
  const PAGE_W = 420;
  const PAGE_H = 297;
  const SIDE = 12;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [PAGE_W, PAGE_H] });

  
  if (data.rows.length === 0 || data.grandTotal === 0) {
    renderPdfHeader(doc, { title, project, settings });
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.text("No data — add category items with costs to generate the S-Curve.", PAGE_W / 2, PAGE_H / 2, { align: "center" });
    renderPdfSignatories(doc, project, settings);
    return doc;
  }

  const reserve = getSignatoriesReserveMm(settings);

  
  const FIXED = { itemNo: 14, scope: 64, cost: 30, wt: 14 };
  const fixedTotal = FIXED.itemNo + FIXED.scope + FIXED.cost + FIXED.wt;
  const usableWidth = PAGE_W - SIDE * 2;
  const dayBandWidth = usableWidth - fixedTotal;

  
  
  
  const MAX_DAYS_PER_CHUNK = 120;
  const chunks: Array<{ start: number; end: number }> = [];
  let cursor = 0;
  let chunkStartDay = 0;
  while (cursor < data.columns.length) {
    let endCol = cursor;
    while (endCol < data.columns.length && data.columns[endCol] - chunkStartDay <= MAX_DAYS_PER_CHUNK) {
      endCol++;
    }
    if (endCol === cursor) endCol = cursor + 1; 
    chunks.push({ start: cursor, end: endCol });
    chunkStartDay = data.columns[endCol - 1];
    cursor = endCol;
  }

  

  
  type RowKind =
    | { kind: "category"; rowIdx: number }
    | { kind: "total" }
    | { kind: "periodic" }
    | { kind: "cumulative" }
    | { kind: "monthlyPct" }
    | { kind: "monthlyCost" }
    | { kind: "cumPct" }
    | { kind: "cumCost" };

  let firstChunkRendered = false;

  chunks.forEach((chunk, chunkIdx) => {
    
    if (firstChunkRendered) doc.addPage([PAGE_W, PAGE_H], "landscape");
    firstChunkRendered = true;

    const isFirstPage = chunkIdx === 0;
    const dayCols = data.columns.slice(chunk.start, chunk.end);
    
    const dayCellW = dayBandWidth / dayCols.length;

    
    const startY = isFirstPage
      ? renderPdfHeader(doc, { title, project, settings })
      : 12;
    
    if (!isFirstPage) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      const fromDay = chunk.start === 0 ? 1 : data.columns[chunk.start - 1] + 1;
      const toDay = data.columns[chunk.end - 1];
      doc.text(
        sanitizePdfText(`${title} — continued (Days ${fromDay}–${toDay}, page ${chunkIdx + 1} of ${chunks.length})`),
        SIDE,
        startY - 3,
      );
      doc.setTextColor(0, 0, 0);
    }

    
    const monthHead: any[] = [
      { content: "Item No.", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
      { content: "Scope of Work", rowSpan: 2, styles: { halign: "left", valign: "middle" } },
      { content: "Cost", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
      { content: "Wt. %", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
    ];
    data.monthGroups.forEach((mg) => {
      const mgStart = mg.startCol;
      const mgEnd = mg.startCol + mg.span;
      const lo = Math.max(mgStart, chunk.start);
      const hi = Math.min(mgEnd, chunk.end);
      if (hi > lo) {
        monthHead.push({ content: mg.label, colSpan: hi - lo, styles: { halign: "center", valign: "middle" } });
      }
    });

    const dayHead = dayCols.map((c) => ({
      content: String(c),
      styles: { halign: "center" as const, valign: "middle" as const, fontSize: 8 },
    }));

    
    const body: any[][] = [];
    data.rows.forEach((row, rowIdx) => {
      const rowKind: RowKind = { kind: "category", rowIdx };
      const cells: any[] = [
        { content: row.itemNo || "", styles: { halign: "center", valign: "middle" }, _kind: rowKind },
        { content: row.description, styles: { valign: "middle" }, _kind: rowKind },
        { content: formatCurrency(row.cost), styles: { halign: "right", valign: "middle" }, _kind: rowKind },
        { content: row.weightPercent.toFixed(2), styles: { halign: "right", valign: "middle" }, _kind: rowKind },
      ];
      for (let ci = chunk.start; ci < chunk.end; ci++) {
        cells.push({ content: "", _kind: rowKind, _colIdx: ci });
      }
      body.push(cells);
    });

    // TOTAL row
    {
      const k: RowKind = { kind: "total" };
      const cells: any[] = [
        { content: "", _kind: k },
        { content: "TOTAL", styles: { fontStyle: "bold" }, _kind: k },
        { content: formatCurrency(data.grandTotal), styles: { halign: "right", fontStyle: "bold" }, _kind: k },
        { content: "100.00", styles: { halign: "right", fontStyle: "bold" }, _kind: k },
      ];
      for (let i = 0; i < dayCols.length; i++) cells.push({ content: "", _kind: k });
      body.push(cells);
    }

    // Periodic Weight % row
    {
      const k: RowKind = { kind: "periodic" };
      const cells: any[] = [
        { content: "PERIODIC WT (%)", colSpan: 4, styles: { halign: "right", fontStyle: "bold", fontSize: 8.5, minCellHeight: 7 }, _kind: k },
      ];
      for (let ci = chunk.start; ci < chunk.end; ci++) {
        const w = data.columnWeights[ci] || 0;
        cells.push({ content: w > 0 ? w.toFixed(2) : "", styles: { halign: "center", fontSize: 7.5, minCellHeight: 7 }, _kind: k, _colIdx: ci });
      }
      body.push(cells);
    }

    
    {
      const k: RowKind = { kind: "cumulative" };
      const cells: any[] = [
        { content: "CUMULATIVE PROGRESS (%)", colSpan: 4, styles: { halign: "right", fontStyle: "bold", fontSize: 8.5, textColor: [180, 30, 30], minCellHeight: 7 }, _kind: k },
      ];
      for (let ci = chunk.start; ci < chunk.end; ci++) {
        const cp = data.cumulativeProgress[ci] || 0;
        cells.push({ content: cp > 0 ? cp.toFixed(2) : "", styles: { halign: "center", fontSize: 7.5, textColor: [180, 30, 30], fontStyle: "bold", minCellHeight: 7 }, _kind: k, _colIdx: ci });
      }
      body.push(cells);
    }

    
    pushMonthRow(body, "MONTHLY ACCOMPLISHMENT (%)", data.monthGroups, chunk, (mIdx) => {
      const v = data.monthlyAccPct[mIdx] || 0;
      return v > 0 ? v.toFixed(2) : "";
    }, [255, 240, 200], [180, 30, 30], { kind: "monthlyPct" });

    pushMonthRow(body, "MONTHLY ACCOMPLISHMENT (Php)", data.monthGroups, chunk, (mIdx) => {
      const v = data.monthlyAccCost[mIdx] || 0;
      return v > 0 ? formatCurrency(v) : "";
    }, [255, 240, 200], [0, 0, 0], { kind: "monthlyCost" });

    pushMonthRow(body, "CUMULATIVE ACCOMPLISHMENT (%)", data.monthGroups, chunk, (mIdx) => {
      const v = data.cumAccPct[mIdx] || 0;
      return v > 0 ? v.toFixed(2) : "";
    }, [250, 220, 160], [120, 20, 20], { kind: "cumPct" });

    pushMonthRow(body, "CUMULATIVE ACCOMPLISHMENT (Php)", data.monthGroups, chunk, (mIdx) => {
      const v = data.cumAccCost[mIdx] || 0;
      return v > 0 ? formatCurrency(v) : "";
    }, [200, 60, 60], [255, 255, 255], { kind: "cumCost" });

    
    const dayCellRects: Map<number, { x: number; y: number; w: number; h: number; page: number }> = new Map();
    let ganttTopY = Infinity;
    let ganttBottomY = -Infinity;

    autoTable(doc, {
      startY,
      margin: { top: startY, bottom: reserve + 4, left: SIDE, right: SIDE },
      theme: "grid",
      tableLineColor: [0, 0, 0],
      tableLineWidth: 0.2,
      head: [monthHead, dayHead as any],
      body,
      styles: {
        fontSize: 8.5,
        cellPadding: 1.6,
        minCellHeight: 7,
        lineColor: [60, 60, 60],
        lineWidth: 0.15,
        overflow: "linebreak",
        valign: "middle",
        textColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: [55, 110, 75],
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: "bold",
        halign: "center",
        minCellHeight: 7,
      },
      columnStyles: {
        0: { cellWidth: FIXED.itemNo, halign: "center" },
        1: { cellWidth: FIXED.scope, overflow: "linebreak" },
        2: { cellWidth: FIXED.cost, halign: "right" },
        3: { cellWidth: FIXED.wt, halign: "right" },
        ...Object.fromEntries(dayCols.map((_, i) => [4 + i, { cellWidth: dayCellW, halign: "center" }])),
      },
      didParseCell: (d) => {
        sanitizeAutoTableCell(d);
      },
      didDrawPage: () => {
        
        
        
      },
      didDrawCell: (d: CellHookData) => {
        const raw: any = d.cell.raw as any;
        if (!raw || !raw._kind) return;
        const kind: RowKind = raw._kind;
        const colIdx: number | undefined = raw._colIdx;
        const isDayCell = d.column.index >= 4;
        if (!isDayCell) return;

        
        if (kind.kind === "category" && typeof colIdx === "number") {
          const row = data.rows[kind.rowIdx];
          const colDay = data.columns[colIdx];
          const prevCol = colIdx === 0 ? 0 : data.columns[colIdx - 1];
          let active = false;
          for (let day = prevCol; day < colDay; day++) {
            if (row.ranges.some((r) => day >= r.from && day < r.to)) { active = true; break; }
          }
          if (active) {
            const [r, g, b] = COLORS[kind.rowIdx % COLORS.length];
            doc.setFillColor(r, g, b);
            const pad = 0.4;
            doc.rect(d.cell.x + pad, d.cell.y + pad, d.cell.width - pad * 2, d.cell.height - pad * 2, "F");
            
          }
          
          ganttTopY = Math.min(ganttTopY, d.cell.y);
          ganttBottomY = Math.max(ganttBottomY, d.cell.y + d.cell.height);
          if (!dayCellRects.has(colIdx)) {
            dayCellRects.set(colIdx, { x: d.cell.x, y: d.cell.y, w: d.cell.width, h: d.cell.height, page: doc.getNumberOfPages() });
          }
        }
      },
    });

    
    if (dayCellRects.size >= 2 && isFinite(ganttTopY) && isFinite(ganttBottomY) && ganttBottomY > ganttTopY) {
      const overlayPage = Math.min(...Array.from(dayCellRects.values()).map((r) => r.page));
      doc.setPage(overlayPage);
      const top = ganttTopY + 0.5;
      const bottom = ganttBottomY - 0.5;
      const height = bottom - top;
      const points: Array<{ x: number; y: number }> = [];
      for (let ci = chunk.start; ci < chunk.end; ci++) {
        const rect = dayCellRects.get(ci);
        if (!rect) continue;
        const cp = data.cumulativeProgress[ci] || 0;
        const x = rect.x + rect.w / 2;
        const y = bottom - (Math.min(cp, 100) / 100) * height;
        points.push({ x, y });
      }
      if (points.length >= 2) {
        
        doc.setFillColor(70, 130, 200);
        doc.setDrawColor(70, 130, 200);
        
        
        doc.setLineWidth(0.5);
        doc.setDrawColor(40, 90, 170);
        for (let i = 1; i < points.length; i++) {
          doc.line(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
        }
        
        doc.setFillColor(40, 90, 170);
        points.forEach((p) => doc.circle(p.x, p.y, 0.6, "F"));
      }
    }

    
    const totalPages = doc.getNumberOfPages();
    
    
    
    
    
  });

  
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    renderPdfSignatories(doc, project, settings);
  }

  return doc;
}

function pushMonthRow(
  body: any[][],
  label: string,
  monthGroups: Array<{ label: string; span: number; startCol: number }>,
  chunk: { start: number; end: number },
  valueFor: (mIdx: number) => string,
  fill: [number, number, number],
  textColor: [number, number, number],
  rowKindMeta: any,
) {
  const cells: any[] = [
    {
      content: label,
      colSpan: 4,
      styles: { halign: "right", fontStyle: "bold", fontSize: 8.5, fillColor: fill, textColor, minCellHeight: 7 },
      _kind: rowKindMeta,
    },
  ];
  monthGroups.forEach((mg, mIdx) => {
    const mgStart = mg.startCol;
    const mgEnd = mg.startCol + mg.span;
    const lo = Math.max(mgStart, chunk.start);
    const hi = Math.min(mgEnd, chunk.end);
    if (hi > lo) {
      cells.push({
        content: sanitizePdfText(valueFor(mIdx)),
        colSpan: hi - lo,
        styles: { halign: "center", fontStyle: "bold", fontSize: 8.5, fillColor: fill, textColor, minCellHeight: 7 },
        _kind: rowKindMeta,
      });
    }
  });
  body.push(cells);
}
