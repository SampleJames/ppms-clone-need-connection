import ExcelJS from "exceljs";
import { Project, PrintSettings } from "@/types";

export interface SCurveExcelOptions {
  totalDuration: number;
  intervalDays: number;
  monthDays: number;
  scheduleData: Record<string, Array<{ from: number; to: number }>>;
  versionName?: string;
}

const COLORS_HEX = [
  "FFD700", "32CD32", "4169E1", "FF8C00",
  "9370DB", "20B2AA", "FF6347", "708090",
];

function getDescendantCost(project: Project, itemId: string): number {
  const children = project.abcItems.filter((i) => i.parentId === itemId);
  let sum = 0;
  for (const c of children) {
    sum += c.isCategory ? getDescendantCost(project, c.id) : c.totalCost;
  }
  return sum;
}

function compute(project: Project, opts: SCurveExcelOptions) {
  const tops = project.abcItems.filter((i) => i.isCategory && !i.parentId);
  const categories = tops.map((cat) => {
    const c = getDescendantCost(project, cat.id);
    return { ...cat, totalCost: c > 0 ? c : cat.totalCost };
  });
  const grandTotal = categories.reduce((s, c) => s + c.totalCost, 0);

  const rows = grandTotal === 0
    ? []
    : categories.map((cat) => ({
        id: cat.id,
        itemNo: cat.itemNo,
        description: cat.description,
        cost: cat.totalCost,
        weightPercent: Math.round((cat.totalCost / grandTotal) * 10000) / 100,
        ranges: opts.scheduleData[cat.id] || [],
      }));

  const columns: number[] = [];
  for (let i = opts.intervalDays; i <= opts.totalDuration; i += opts.intervalDays) columns.push(i);
  if (columns.length === 0 || columns[columns.length - 1] < opts.totalDuration) columns.push(opts.totalDuration);

  const monthGroups: Array<{ label: string; span: number; startCol: number }> = [];
  let monthStart = 0;
  let cIdx = 0;
  while (cIdx < columns.length) {
    const monthEnd = monthStart + opts.monthDays;
    let span = 0;
    const startCol = cIdx;
    while (cIdx < columns.length && columns[cIdx] <= monthEnd) {
      span++; cIdx++;
    }
    if (span > 0) monthGroups.push({ label: `${opts.monthDays} Calendar Days`, span, startCol });
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
    rows, columns, monthGroups, grandTotal,
    columnWeights: colWeights.map((w) => Math.round(w * 100) / 100),
    cumulativeProgress: cumulative,
    monthlyAccPct: mAccPct, monthlyAccCost: mAccCost,
    cumAccPct: cAccPct, cumAccCost: cAccCost,
  };
}

const THIN = { style: "thin" as const, color: { argb: "FF000000" } };
const ALL_BORDERS = { top: THIN, bottom: THIN, left: THIN, right: THIN };

function dataUrlToBuffer(dataUrl: string): { buffer: ArrayBuffer; ext: "png" | "jpeg" } | null {
  const m = /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(dataUrl);
  if (!m) return null;
  const ext = m[1].toLowerCase().startsWith("jp") ? "jpeg" : "png";
  const bin = atob(m[2]);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return { buffer: buf.buffer, ext };
}

function renderCurvePng(progress: number[], width: number, height: number): ArrayBuffer | null {
  if (typeof document === "undefined" || progress.length < 2) return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.clearRect(0, 0, width, height);

  const N = progress.length;
  const padTop = 6;
  const padBottom = 4;
  const usableH = height - padTop - padBottom;
  const points: Array<[number, number]> = progress.map((v, i) => {
    const x = ((i + 0.5) / N) * width;
    const y = padTop + usableH - (Math.min(Math.max(v, 0), 100) / 100) * usableH;
    return [x, y];
  });

  
  const smoothPath = (pts: Array<[number, number]>) => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2;
      const my = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last[0], last[1]);
  };

  
  ctx.save();
  smoothPath(points);
  ctx.lineTo(points[points.length - 1][0], height - padBottom);
  ctx.lineTo(points[0][0], height - padBottom);
  ctx.closePath();
  ctx.fillStyle = "rgba(70, 130, 200, 0.18)";
  ctx.fill();
  ctx.restore();

  
  smoothPath(points);
  ctx.strokeStyle = "rgba(20, 60, 140, 0.95)";
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();

  
  ctx.fillStyle = "rgba(20, 60, 140, 1)";
  points.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });

  const dataUrl = canvas.toDataURL("image/png");
  const base64 = dataUrl.split(",")[1];
  if (!base64) return null;
  const bin = atob(base64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

export async function exportSCurveToExcel(
  project: Project,
  settings: PrintSettings,
  opts: SCurveExcelOptions,
) {
  const data = compute(project, opts);

  const wb = new ExcelJS.Workbook();
  wb.creator = "CostPro";
  wb.created = new Date();
  const ws = wb.addWorksheet("S-Curve", {
    views: [{ showGridLines: false }],
    pageSetup: { orientation: "landscape", paperSize: 5, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  
  const dayCount = data.columns.length;
  const totalCols = 4 + dayCount;
  const lastColLetter = ws.getColumn(totalCols).letter;

  
  ws.getColumn(1).width = 8;   
  ws.getColumn(2).width = 38;  
  ws.getColumn(3).width = 16;  
  ws.getColumn(4).width = 8;   
  for (let i = 5; i <= totalCols; i++) ws.getColumn(i).width = 4.5;
  
  for (let i = totalCols + 1; i <= totalCols + 80; i++) ws.getColumn(i).hidden = true;

  let rowIdx = 1;

  
  const logoRowsReserved = settings.logoDataUrl ? 4 : 0;
  if (settings.logoDataUrl) {
    const img = dataUrlToBuffer(settings.logoDataUrl);
    if (img) {
      const id = wb.addImage({ buffer: img.buffer, extension: img.ext });
      
      ws.addImage(id, {
        tl: { col: 0.1, row: 0.1 } as any,
        br: { col: 2.9, row: logoRowsReserved - 0.1 } as any,
        editAs: "twoCell" as any,
      });
    }
  }

  const orgLines = (settings.orgLines || []).filter((l) => l && l.trim());
  orgLines.forEach((line, i) => {
    const r = ws.getRow(rowIdx);
    ws.mergeCells(rowIdx, 1, rowIdx, totalCols);
    r.getCell(1).value = line;
    r.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    r.getCell(1).font = {
      name: "Arial",
      size: i === 0 ? Math.max(11, settings.orgPrimaryFontSize ?? 12) : Math.max(9, settings.orgSecondaryFontSize ?? 10),
      bold: i === 0,
    };
    r.height = 18;
    rowIdx++;
  });
  if (settings.addressLine) {
    ws.mergeCells(rowIdx, 1, rowIdx, totalCols);
    const c = ws.getRow(rowIdx).getCell(1);
    c.value = settings.addressLine;
    c.alignment = { horizontal: "center", vertical: "middle" };
    c.font = { name: "Arial", size: settings.addressFontSize ?? 9, italic: true };
    rowIdx++;
  }

  
  while (settings.logoDataUrl && rowIdx <= 1 + logoRowsReserved) {
    rowIdx++;
  }

  rowIdx++; 

  
  const titleText = settings.titleOverride?.trim() || `S-CURVE${opts.versionName ? ` — ${opts.versionName}` : ""}`;
  ws.mergeCells(rowIdx, 1, rowIdx, totalCols);
  const titleCell = ws.getRow(rowIdx).getCell(1);
  titleCell.value = settings.titleUppercase === false ? titleText : titleText.toUpperCase();
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.font = { name: "Arial", size: settings.titleFontSize ?? 14, bold: settings.titleBold !== false };
  ws.getRow(rowIdx).height = 22;
  rowIdx++;

  
  if (settings.showProjectInfo !== false) {
    const projectName = settings.projectInfoNameOverride?.trim() || project.name;
    const location = settings.projectInfoLocationOverride?.trim() || project.location || settings.defaultLocation || "";
    const contractor = settings.projectInfoContractorOverride?.trim() || settings.defaultContractor || "";
    const dateStr = settings.projectInfoDateOverride?.trim() || new Date().toLocaleDateString();

    const infoLines: Array<[string, string]> = [];
    if (settings.projectInfoShowName !== false) infoLines.push(["Project:", projectName]);
    if (settings.projectInfoShowLocation !== false && location) infoLines.push(["Location:", location]);
    if (settings.projectInfoShowContractor !== false && contractor) infoLines.push(["Contractor:", contractor]);
    if (settings.projectInfoShowDate !== false) infoLines.push(["Date:", dateStr]);

    rowIdx++; // spacer
    infoLines.forEach(([label, val]) => {
      const r = ws.getRow(rowIdx);
      r.getCell(1).value = label;
      r.getCell(1).font = { name: "Arial", size: settings.projectInfoFontSize ?? 10, bold: true };
      r.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
      ws.mergeCells(rowIdx, 2, rowIdx, totalCols);
      r.getCell(2).value = val;
      r.getCell(2).font = { name: "Arial", size: settings.projectInfoFontSize ?? 10 };
      r.getCell(2).alignment = { horizontal: "left", vertical: "middle" };
      rowIdx++;
    });
  }

  rowIdx++; 

  
  const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF376E4B" } };
  const HEADER_FONT: Partial<ExcelJS.Font> = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };

  const hdrRow1 = ws.getRow(rowIdx);
  const hdrRow2 = ws.getRow(rowIdx + 1);
  
  const fixedHeaders = ["Item No.", "Scope of Work", "Cost", "Wt. %"];
  fixedHeaders.forEach((label, i) => {
    ws.mergeCells(rowIdx, i + 1, rowIdx + 1, i + 1);
    const c = hdrRow1.getCell(i + 1);
    c.value = label;
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.font = HEADER_FONT;
    c.fill = HEADER_FILL;
    c.border = ALL_BORDERS;
  });
  
  data.monthGroups.forEach((mg) => {
    const startCol = 5 + mg.startCol;
    const endCol = startCol + mg.span - 1;
    ws.mergeCells(rowIdx, startCol, rowIdx, endCol);
    const c = hdrRow1.getCell(startCol);
    c.value = mg.label;
    c.alignment = { horizontal: "center", vertical: "middle" };
    c.font = HEADER_FONT;
    c.fill = HEADER_FILL;
    c.border = ALL_BORDERS;
  });
  
  data.columns.forEach((d, i) => {
    const c = hdrRow2.getCell(5 + i);
    c.value = d;
    c.alignment = { horizontal: "center", vertical: "middle" };
    c.font = HEADER_FONT;
    c.fill = HEADER_FILL;
    c.border = ALL_BORDERS;
  });
  hdrRow1.height = 18;
  hdrRow2.height = 16;
  rowIdx += 2;

  
  const ganttStartRow = rowIdx; 
  data.rows.forEach((row, rIdx) => {
    const colorHex = COLORS_HEX[rIdx % COLORS_HEX.length];
    const r = ws.getRow(rowIdx);
    r.getCell(1).value = row.itemNo || "";
    r.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    r.getCell(2).value = row.description;
    r.getCell(2).alignment = { horizontal: "left", vertical: "middle", wrapText: true };
    r.getCell(3).value = Number(row.cost);
    r.getCell(3).numFmt = '"₱"#,##0.00';
    r.getCell(3).alignment = { horizontal: "right", vertical: "middle" };
    r.getCell(4).value = row.weightPercent;
    r.getCell(4).numFmt = '0.00"%"';
    r.getCell(4).alignment = { horizontal: "right", vertical: "middle" };
    for (let ci = 0; ci < dayCount; ci++) {
      const cell = r.getCell(5 + ci);
      const colDay = data.columns[ci];
      const prevCol = ci === 0 ? 0 : data.columns[ci - 1];
      let active = false;
      for (let d = prevCol; d < colDay; d++) {
        if (row.ranges.some((rr) => d >= rr.from && d < rr.to)) { active = true; break; }
      }
      if (active) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + colorHex } };
      }
    }
    for (let i = 1; i <= totalCols; i++) {
      r.getCell(i).border = ALL_BORDERS;
      r.getCell(i).font = r.getCell(i).font || { name: "Arial", size: 9 };
    }
    r.height = 18;
    rowIdx++;
  });
  const ganttEndRow = rowIdx - 1; 

  
  if (data.rows.length > 0 && dayCount >= 2) {
    const curvePng = renderCurvePng(data.cumulativeProgress, Math.max(600, dayCount * 24), Math.max(120, data.rows.length * 36));
    if (curvePng) {
      const curveId = wb.addImage({ buffer: curvePng, extension: "png" });
      
      ws.addImage(curveId, {
        tl: { col: 4, row: ganttStartRow - 1 } as any,
        br: { col: totalCols, row: ganttEndRow } as any,
        editAs: "twoCell" as any,
      });
    }
  }

  
  {
    const r = ws.getRow(rowIdx);
    ws.mergeCells(rowIdx, 1, rowIdx, 2);
    r.getCell(1).value = "TOTAL";
    r.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    r.getCell(1).font = { name: "Arial", size: 10, bold: true };
    r.getCell(3).value = Number(data.grandTotal);
    r.getCell(3).numFmt = '"₱"#,##0.00';
    r.getCell(3).alignment = { horizontal: "right", vertical: "middle" };
    r.getCell(3).font = { name: "Arial", size: 10, bold: true };
    r.getCell(4).value = 100;
    r.getCell(4).numFmt = '0.00"%"';
    r.getCell(4).alignment = { horizontal: "right", vertical: "middle" };
    r.getCell(4).font = { name: "Arial", size: 10, bold: true };
    const totalFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEEEEE" } };
    for (let i = 1; i <= totalCols; i++) {
      r.getCell(i).fill = totalFill;
      r.getCell(i).border = ALL_BORDERS;
    }
    rowIdx++;
  }

  
  {
    const r = ws.getRow(rowIdx);
    ws.mergeCells(rowIdx, 1, rowIdx, 4);
    r.getCell(1).value = "PERIODIC WT (%)";
    r.getCell(1).alignment = { horizontal: "right", vertical: "middle" };
    r.getCell(1).font = { name: "Arial", size: 9, bold: true };
    data.columnWeights.forEach((w, i) => {
      const c = r.getCell(5 + i);
      if (w > 0) { c.value = w; c.numFmt = "0.00"; }
      c.alignment = { horizontal: "center", vertical: "middle" };
      c.font = { name: "Arial", size: 8 };
    });
    for (let i = 1; i <= totalCols; i++) r.getCell(i).border = ALL_BORDERS;
    rowIdx++;
  }

  
  {
    const r = ws.getRow(rowIdx);
    ws.mergeCells(rowIdx, 1, rowIdx, 4);
    r.getCell(1).value = "CUMULATIVE PROGRESS (%)";
    r.getCell(1).alignment = { horizontal: "right", vertical: "middle" };
    r.getCell(1).font = { name: "Arial", size: 9, bold: true, color: { argb: "FFB41E1E" } };
    data.cumulativeProgress.forEach((cp, i) => {
      const c = r.getCell(5 + i);
      if (cp > 0) { c.value = cp; c.numFmt = "0.00"; }
      c.alignment = { horizontal: "center", vertical: "middle" };
      c.font = { name: "Arial", size: 8, bold: true, color: { argb: "FFB41E1E" } };
    });
    for (let i = 1; i <= totalCols; i++) r.getCell(i).border = ALL_BORDERS;
    rowIdx++;
  }

  
  const pushMonthRow = (
    label: string,
    fillArgb: string,
    textArgb: string,
    getValue: (mIdx: number) => { v: number; fmt: string } | null,
  ) => {
    const r = ws.getRow(rowIdx);
    ws.mergeCells(rowIdx, 1, rowIdx, 4);
    r.getCell(1).value = label;
    r.getCell(1).alignment = { horizontal: "right", vertical: "middle" };
    r.getCell(1).font = { name: "Arial", size: 9, bold: true, color: { argb: textArgb } };
    r.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillArgb } };
    data.monthGroups.forEach((mg, mIdx) => {
      const startCol = 5 + mg.startCol;
      const endCol = startCol + mg.span - 1;
      if (endCol > startCol) ws.mergeCells(rowIdx, startCol, rowIdx, endCol);
      const c = r.getCell(startCol);
      const result = getValue(mIdx);
      if (result && result.v > 0) { c.value = result.v; c.numFmt = result.fmt; }
      c.alignment = { horizontal: "center", vertical: "middle" };
      c.font = { name: "Arial", size: 9, bold: true, color: { argb: textArgb } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillArgb } };
    });
    for (let i = 1; i <= totalCols; i++) r.getCell(i).border = ALL_BORDERS;
    rowIdx++;
  };

  pushMonthRow("MONTHLY ACCOMPLISHMENT (%)", "FFFFF0C8", "FFB41E1E",
    (m) => ({ v: data.monthlyAccPct[m] || 0, fmt: "0.00" }));
  pushMonthRow("MONTHLY ACCOMPLISHMENT (Php)", "FFFFF0C8", "FF000000",
    (m) => ({ v: data.monthlyAccCost[m] || 0, fmt: '"₱"#,##0.00' }));
  pushMonthRow("CUMULATIVE ACCOMPLISHMENT (%)", "FFFADCA0", "FF781414",
    (m) => ({ v: data.cumAccPct[m] || 0, fmt: "0.00" }));
  pushMonthRow("CUMULATIVE ACCOMPLISHMENT (Php)", "FFC83C3C", "FFFFFFFF",
    (m) => ({ v: data.cumAccCost[m] || 0, fmt: '"₱"#,##0.00' }));

  
  const chartWs = wb.addWorksheet("S-Curve Data", {
    views: [{ showGridLines: false }],
  });
  chartWs.getColumn(1).width = 10;
  chartWs.getColumn(2).width = 26;
  chartWs.getColumn(3).width = 22;

  const titleR = chartWs.getRow(1);
  chartWs.mergeCells(1, 1, 1, 3);
  titleR.getCell(1).value = "S-Curve Data (chart-ready)";
  titleR.getCell(1).font = { name: "Arial", size: 12, bold: true, italic: true };
  titleR.getCell(1).alignment = { horizontal: "left", vertical: "middle" };

  const chartHdr = chartWs.getRow(3);
  chartHdr.getCell(1).value = "Day";
  chartHdr.getCell(2).value = "Cumulative Progress (%)";
  chartHdr.getCell(3).value = "Periodic Weight (%)";
  [1, 2, 3].forEach((i) => {
    chartHdr.getCell(i).font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    chartHdr.getCell(i).fill = HEADER_FILL;
    chartHdr.getCell(i).alignment = { horizontal: "center", vertical: "middle" };
    chartHdr.getCell(i).border = ALL_BORDERS;
  });
  data.columns.forEach((d, i) => {
    const r = chartWs.getRow(4 + i);
    r.getCell(1).value = d;
    r.getCell(2).value = data.cumulativeProgress[i] || 0;
    r.getCell(2).numFmt = "0.00";
    r.getCell(3).value = data.columnWeights[i] || 0;
    r.getCell(3).numFmt = "0.00";
    [1, 2, 3].forEach((c) => {
      r.getCell(c).alignment = { horizontal: "center", vertical: "middle" };
      r.getCell(c).border = ALL_BORDERS;
      r.getCell(c).font = { name: "Arial", size: 9 };
    });
  });
  
  for (let i = 4; i <= 80; i++) chartWs.getColumn(i).hidden = true;

  
  const sigs = (settings.signatories || []).filter((s) => s && (s.name || s.label));
  if (sigs.length > 0) {
    rowIdx += 3;
    const perRow = Math.min(sigs.length, 3);
    const span = Math.floor(totalCols / perRow);

    
    for (let i = 0; i < sigs.length; i += perRow) {
      const group = sigs.slice(i, i + perRow);
      
      const nameRow = ws.getRow(rowIdx);
      group.forEach((s, gi) => {
        const startCol = gi * span + 1;
        const endCol = gi === group.length - 1 ? totalCols : startCol + span - 1;
        ws.mergeCells(rowIdx, startCol, rowIdx, endCol);
        const c = nameRow.getCell(startCol);
        c.value = (s.name || "").toUpperCase();
        c.alignment = { horizontal: "center", vertical: "middle" };
        c.font = { name: "Arial", size: settings.signatoryNameFontSize ?? 11, bold: true };
        c.border = { bottom: THIN };
      });
      nameRow.height = 22;
      rowIdx++;
      
      const posRow = ws.getRow(rowIdx);
      group.forEach((s, gi) => {
        const startCol = gi * span + 1;
        const endCol = gi === group.length - 1 ? totalCols : startCol + span - 1;
        ws.mergeCells(rowIdx, startCol, rowIdx, endCol);
        const c = posRow.getCell(startCol);
        c.value = s.position || "";
        c.alignment = { horizontal: "center", vertical: "middle" };
        c.font = { name: "Arial", size: settings.signatoryPositionFontSize ?? 9 };
      });
      rowIdx++;
      
      const labelRow = ws.getRow(rowIdx);
      group.forEach((s, gi) => {
        const startCol = gi * span + 1;
        const endCol = gi === group.length - 1 ? totalCols : startCol + span - 1;
        ws.mergeCells(rowIdx, startCol, rowIdx, endCol);
        const c = labelRow.getCell(startCol);
        c.value = (s.label || "").toUpperCase();
        c.alignment = { horizontal: "center", vertical: "middle" };
        c.font = { name: "Arial", size: settings.signatoryLabelFontSize ?? 9, italic: true };
      });
      rowIdx += 2;
    }
  }

  
  ws.pageSetup.printArea = `A1:${lastColLetter}${rowIdx}`;
  ws.pageSetup.printTitlesRow = "1:1";

  
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeName = project.name.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "");
  const versionTag = opts.versionName ? `-${opts.versionName.replace(/[^a-z0-9]+/gi, "_")}` : "";
  a.download = `S-Curve-${safeName}${versionTag}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
