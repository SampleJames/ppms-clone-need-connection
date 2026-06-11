import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { Project, ABCItem, DUPAItem, MaterialItem, LaborItem, EquipmentItem } from "@/types";
import { recalcDupa, recalcABCItem } from "./calculations";
import { formatCurrency } from "./calculations";
import { createDefaultEquipment, createDefaultLabor, createDefaultMaterial, ensureMinimumDupaRows } from "./dupaDefaults";

const THIN_BORDER = {
  top: { style: "thin" as const, color: { argb: "FF000000" } },
  left: { style: "thin" as const, color: { argb: "FF000000" } },
  bottom: { style: "thin" as const, color: { argb: "FF000000" } },
  right: { style: "thin" as const, color: { argb: "FF000000" } },
};

function applyBorders(ws: ExcelJS.Worksheet, r1: number, c1: number, r2: number, c2: number) {
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      ws.getRow(r).getCell(c).border = THIN_BORDER;
    }
  }
}

const ABC_HEADER_FILL = "FFFFFFFF";       
const ABC_HEADER_TEXT = "FF000000";       
const ABC_ALT_ROW_FILL = "FFFFFFFF";
const ABC_CATEGORY_FILL = "FF92D050";     
const ABC_CATEGORY_TEXT = "FF000000";
const ABC_SUBTOTAL_FILL = "FFFFFF00";     
const ABC_SUBTOTAL_TEXT = "FF000000";
const ABC_GRANDTOTAL_FILL = "FFFFA500";   
const ABC_GRANDTOTAL_TEXT = "FF000000";

const DUPA_ACCENT_FILL = "FF29528A";
const DUPA_ACCENT_TEXT = "FFFFFFFF";

const f = (formula: string, result: number) => ({ formula, result });
const colLetter = (n: number) => {
  let s = "";
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
};

interface DupaRefs {
  sheetName: string;
  matSubtotalRow: number;
  labSubtotalRow: number;
  eqSubtotalRow: number;
  qtyCellRef: string; // e.g. 'DUPA 1.5'!$C$3 — but we use 1 if 0
}

export async function buildProjectWorkbook(project: Project): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "App";
  wb.created = new Date();

  
  const dupaRefMap = new Map<string, DupaRefs>(); 

  for (const dupa of project.dupaItems) {
    const rawName = `DUPA ${dupa.itemNo}`.substring(0, 31).replace(/[\\/?*[\]:]/g, "_");
    let sheetName = rawName;
    let suffix = 1;
    while (wb.getWorksheet(sheetName)) sheetName = `${rawName.substring(0, 28)}_${suffix++}`;

    const ws = wb.addWorksheet(sheetName, {
      pageSetup: { orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 1, margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } },
      views: [{ showGridLines: false }],
    });
    
    
    ws.columns = [
      { width: 8 }, { width: 36 }, { width: 12 }, { width: 8 }, { width: 14 }, { width: 16 },
    ];
    const COLS = 6;

    
    const GREY_LIGHT = "FFD9D9D9";
    const GREY_MED = "FFA5A5A5";

    
    ws.mergeCells(1, 1, 1, COLS);
    const t = ws.getCell(1, 1);
    t.value = "Detailed Unit Price Analysis";
    t.font = { bold: true, size: 12 };
    t.alignment = { horizontal: "center", vertical: "middle" };
    t.border = THIN_BORDER;
    ws.getRow(1).height = 22;

    
    const labelRow = ws.getRow(2);
    ["", "", "Qty.", "Unit", "Unit Price", "Total Price"].forEach((v, i) => {
      const cell = labelRow.getCell(i + 1);
      cell.value = v;
      cell.font = { size: 11 };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = THIN_BORDER;
    });

    
    const titleRow = ws.getRow(3);
    titleRow.getCell(1).value = dupa.itemNo || "";
    titleRow.getCell(2).value = dupa.description || "";
    titleRow.getCell(3).value = dupa.quantity || 0;
    titleRow.getCell(4).value = dupa.unit || "";
    titleRow.getCell(5).value = dupa.unitPrice || 0;
    titleRow.getCell(6).value = dupa.totalPrice || 0;
    for (let c = 1; c <= COLS; c++) {
      const cell = titleRow.getCell(c);
      cell.font = { bold: true, size: 11 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREY_LIGHT } };
      cell.alignment = c === 2 ? { horizontal: "left", vertical: "middle", wrapText: true } : { horizontal: c >= 5 ? "right" : "center", vertical: "middle" };
      cell.border = THIN_BORDER;
      if (c === 5 || c === 6) cell.numFmt = "#,##0.00";
    }
    titleRow.height = 22;
    const qtyRefAbs = `$C$3`;

    let r = 5;

    const sectionBanner = (letter: string, label: string) => {
      const row = ws.getRow(r);
      row.getCell(1).value = letter;
      row.getCell(2).value = label;
      ws.mergeCells(r, 2, r, COLS);
      for (let c = 1; c <= COLS; c++) {
        const cell = row.getCell(c);
        cell.font = { bold: true, size: 11 };
        cell.alignment = { horizontal: c === 1 ? "center" : "left", vertical: "middle" };
        cell.border = THIN_BORDER;
      }
      r++;
    };
    const colHeaders = (cols: string[]) => {
      const row = ws.getRow(r);
      cols.forEach((h, i) => {
        const cell = row.getCell(i + 1);
        cell.value = h;
        cell.font = { size: 10 };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = THIN_BORDER;
      });
      r++;
    };
        const itemRow = (idx: number, desc: string, qty: number, unit: string, rate: number, total: number) => {
      const row = ws.getRow(r);
      row.getCell(1).value = idx;
      row.getCell(2).value = desc;
      row.getCell(3).value = qty;
      row.getCell(4).value = unit;
      row.getCell(5).value = rate;
      row.getCell(6).value = f(`C${r}*E${r}`, total);
      for (let c = 1; c <= COLS; c++) {
        const cell = row.getCell(c);
        cell.font = { size: 10 };
        cell.border = THIN_BORDER;
        if (c === 1) cell.alignment = { horizontal: "center", vertical: "middle" };
        else if (c === 2) cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
        else if (c === 4) cell.alignment = { horizontal: "center", vertical: "middle" };
        else cell.alignment = { horizontal: c === 3 ? "center" : "right", vertical: "middle" };
        if (c === 3 || c === 5 || c === 6) cell.numFmt = "#,##0.00";
      }
      r++;
    };
        const subtotalRow = (label: string, startRow: number, endRow: number, total: number): number => {
      const row = ws.getRow(r);
      ws.mergeCells(r, 1, r, 5);
      row.getCell(1).value = label;
      row.getCell(6).value = endRow >= startRow ? f(`SUM(F${startRow}:F${endRow})`, total) : f("0", total);
      for (let c = 1; c <= COLS; c++) {
        const cell = row.getCell(c);
        cell.font = { size: 10 };
        cell.alignment = { horizontal: c === 6 ? "right" : "left", vertical: "middle" };
        cell.border = THIN_BORDER;
      }
      row.getCell(6).numFmt = "#,##0.00";
      const subRow = r;
      r++;
      return subRow;
    };

    
    sectionBanner("A.", "Materials");
    colHeaders(["Item No.", "Description", "Qty.", "Unit", "Unit Cost", "Total Cost"]);
    const matStart = r;
    let matIdx = 0;
    for (const m of dupa.materials) {
      matIdx++;
      itemRow(matIdx, m.description || "", m.quantity || 0, m.unit || "", m.unitCost || 0, m.totalCost || 0);
    }
    const matEnd = r - 1;
    const matSubRow = subtotalRow("(a) Total Cost of Materials", matStart, matEnd, dupa.totalMaterials || 0);

    
    sectionBanner("B.", "Labor");
    colHeaders(["Item No.", "Job Type", "Man-Hours", "", "Wage Rate", "Total Cost"]);
    const labStart = r;
    let labIdx = 0;
    for (const l of dupa.labor) {
      labIdx++;
      itemRow(labIdx, l.description || "", l.manDays || 0, "", l.wageRate || 0, l.totalCost || 0);
    }
    const labEnd = r - 1;
    const labSubRow = subtotalRow("(b) Total Cost of Labor", labStart, labEnd, dupa.totalLabor || 0);

    
    sectionBanner("C.", "Equipment Utilization");
    colHeaders(["Item No.", "Equipment Utilized", "Utilization Period", "", "Utilization Rate", "Total Cost"]);
    const eqStart = r;
    let eqIdx = 0;
    for (const e of dupa.equipment) {
      eqIdx++;
      itemRow(eqIdx, e.description || "", e.period || 0, "", e.rate || 0, e.totalCost || 0);
    }
    const eqEnd = r - 1;
    const eqSubRow = subtotalRow("(c) Total Cost for Equipment Utilization", eqStart, eqEnd, dupa.totalEquipment || 0);

    
    const writeSummary = (label: string, formula: string, result: number, greyValue = false): number => {
      const row = ws.getRow(r);
      ws.mergeCells(r, 1, r, 5);
      row.getCell(1).value = label;
      row.getCell(6).value = f(formula, result);
      for (let c = 1; c <= COLS; c++) {
        const cell = row.getCell(c);
        cell.font = { size: 10 };
        cell.alignment = { horizontal: c === 6 ? "right" : "left", vertical: "middle" };
        cell.border = THIN_BORDER;
      }
      row.getCell(6).numFmt = "#,##0.00";
      if (greyValue) {
        row.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREY_MED } };
      }
      const ret = r;
      r++;
      return ret;
    };
    const directRow = writeSummary("(d) Total Direct Costs = (a) + (b) + (c)", `F${matSubRow}+F${labSubRow}+F${eqSubRow}`, dupa.totalDirectCost || 0, true);
    const indPct = dupa.indirectCostPercent || 0;
    const indirectRow = writeSummary(`(e) Indirect Costs: OCM and Profit (${indPct}%)`, `F${directRow}*${indPct}/100`, dupa.indirectCost || 0, true);
    const dpiRow = writeSummary("(f) Total Direct and Indirect Costs = (d) + (e)", `F${directRow}+F${indirectRow}`, dupa.totalDirectAndIndirect || 0);
    const vatPct = dupa.vatPercent || 0;
    const vatRow = writeSummary(`(g) Value Added Tax (${vatPct}%)`, `F${dpiRow}*${vatPct}/100`, dupa.vat || 0);
    writeSummary("(h) Total Price", `F${dpiRow}+F${vatRow}`, dupa.totalPrice || 0);

    dupaRefMap.set(dupa.abcItemId, {
      sheetName,
      matSubtotalRow: matSubRow,
      labSubtotalRow: labSubRow,
      eqSubtotalRow: eqSubRow,
      qtyCellRef: qtyRefAbs,
    });
  }

  
  const abcWs = wb.addWorksheet("ABC", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } },
  });
  
  wb.worksheets.unshift(wb.worksheets.pop()!);

  
  
  
  
  abcWs.columns = [
    { width: 9 }, { width: 42 }, { width: 8 }, { width: 8 },
    { width: 14 }, { width: 14 }, { width: 14 }, { width: 8 }, { width: 8 },
    { width: 8 }, { width: 12 }, { width: 12 }, { width: 14 }, { width: 15 }, { width: 14 },
  ];
  const ABC_COLS = 15;

  
  abcWs.mergeCells(1, 1, 1, ABC_COLS);
  const title = abcWs.getCell(1, 1);
  title.value = "APPROVED BUDGET FOR THE CONTRACT";
  title.font = { bold: true, size: 14, color: { argb: ABC_HEADER_TEXT } };
  title.alignment = { horizontal: "center", vertical: "middle" };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ABC_HEADER_FILL } };
  abcWs.getRow(1).height = 24;

  
  abcWs.mergeCells(2, 1, 2, ABC_COLS);
  const proj = abcWs.getCell(2, 1);
  proj.value = `Project: ${project.name}`;
  proj.font = { bold: true, size: 11 };
  proj.alignment = { horizontal: "left", vertical: "middle" };
  abcWs.getRow(2).height = 20;

  let firstHeaderRow = 3;
  if (project.description) {
    abcWs.mergeCells(3, 1, 3, ABC_COLS);
    const desc = abcWs.getCell(3, 1);
    desc.value = project.description;
    desc.font = { italic: true, size: 10, color: { argb: "FF555555" } };
    desc.alignment = { horizontal: "left" };
    firstHeaderRow = 4;
  }
  
  firstHeaderRow += 1;

  
  const r1 = firstHeaderRow;       
  const r2 = firstHeaderRow + 1;   
  const r3 = firstHeaderRow + 2;   
  const r4 = firstHeaderRow + 3;   

  const styleHeaderCell = (cell: ExcelJS.Cell, opts?: { italic?: boolean; size?: number }) => {
    cell.font = {
      bold: !opts?.italic,
      italic: !!opts?.italic,
      size: opts?.size ?? 9,
      color: { argb: ABC_HEADER_TEXT },
    };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ABC_HEADER_FILL } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = THIN_BORDER;
  };

  
  const topLabels: { col: number; label: string; colSpan?: number; rowSpan?: number }[] = [
    { col: 1, label: "Item No.", rowSpan: 2 },
    { col: 2, label: "Description", rowSpan: 2 },
    { col: 3, label: "Qty", rowSpan: 2 },
    { col: 4, label: "Unit", rowSpan: 2 },
    { col: 5, label: "Materials", rowSpan: 2 },
    { col: 6, label: "Labor & Equip", rowSpan: 2 },
    { col: 7, label: "Est. Direct Cost", rowSpan: 2 },
    { col: 8, label: "MARK-UPS IN PERCENT", colSpan: 2 },
    { col: 10, label: "TOTAL MARK-UP", colSpan: 2 },
    { col: 12, label: "VAT", rowSpan: 2 },
    { col: 13, label: "Total Indirect", rowSpan: 2 },
    { col: 14, label: "Total Cost", rowSpan: 2 },
    { col: 15, label: "Unit Cost", rowSpan: 2 },
  ];

  for (const t of topLabels) {
    const rowSpan = t.rowSpan ?? 1;
    const colSpan = t.colSpan ?? 1;
    const endR = r1 + rowSpan - 1;
    const endC = t.col + colSpan - 1;
    if (rowSpan > 1 || colSpan > 1) abcWs.mergeCells(r1, t.col, endR, endC);
    const cell = abcWs.getCell(r1, t.col);
    cell.value = t.label;
    styleHeaderCell(cell);
    
    for (let rr = r1; rr <= endR; rr++) {
      for (let cc = t.col; cc <= endC; cc++) {
        const c2 = abcWs.getCell(rr, cc);
        c2.border = THIN_BORDER;
        c2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ABC_HEADER_FILL } };
      }
    }
  }
  
  const subLabels: Record<number, string> = { 8: "OCM", 9: "PROFIT", 10: "%", 11: "Value" };
  for (const [colStr, label] of Object.entries(subLabels)) {
    const cc = Number(colStr);
    const cell = abcWs.getCell(r2, cc);
    cell.value = label;
    styleHeaderCell(cell);
  }
  abcWs.getRow(r1).height = 18;
  abcWs.getRow(r2).height = 18;

  
  const numberMap: Record<number, string> = {
    3: "1", 4: "2", 5: "3", 6: "4", 7: "5",
    8: "6", 9: "7", 10: "8", 11: "9", 12: "10",
    13: "11", 14: "12", 15: "13",
  };
  for (let c = 1; c <= ABC_COLS; c++) {
    const cell = abcWs.getCell(r3, c);
    cell.value = numberMap[c] ?? "";
    styleHeaderCell(cell, { size: 8 });
  }
  // Formula reference row (italic, small)
  const formulaMap: Record<number, string> = {
    7: "(3)+(4)",
    10: "(6)+(7)",
    11: "(5) x (8)",
    12: "5% x ((5)+(9))",
    13: "(9)+(10)",
    14: "(5+11) x (1)",
    15: "(12) / (1)",
  };
  for (let c = 1; c <= ABC_COLS; c++) {
    const cell = abcWs.getCell(r4, c);
    cell.value = formulaMap[c] ?? "";
    styleHeaderCell(cell, { italic: true, size: 7 });
  }
  abcWs.getRow(r3).height = 14;
  abcWs.getRow(r4).height = 14;

  // ===== Body =====
  const childrenOf = (pid: string | null) =>
    project.abcItems
      .filter((i) => (i.parentId ?? null) === pid)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  let rowIdx = r4 + 1;
  const allLeafTotalRefs: string[] = []; // column N (14) refs for grand total

  const writeLeaf = (item: ABCItem): { totalRef: string; total: number } => {
    const r = abcWs.getRow(rowIdx);
    const ref = dupaRefMap.get(item.id);
    const rN = rowIdx;
    const vatPct = item.vatPercent || 0;

    r.getCell(1).value = item.itemNo;
    r.getCell(2).value = item.description;
    r.getCell(3).value = item.quantity;
    r.getCell(4).value = item.unit;

    if (ref) {
      const sn = `'${ref.sheetName}'`;
      // ABC stores per-unit cost; divide DUPA totals by qty (C column) to match.
      r.getCell(5).value = f(`IF(C${rN}=0,0,${sn}!F${ref.matSubtotalRow}/C${rN})`, item.materialsCost);
      r.getCell(6).value = f(`IF(C${rN}=0,0,(${sn}!F${ref.labSubtotalRow}+${sn}!F${ref.eqSubtotalRow})/C${rN})`, item.laborEquipmentCost);
    } else {
      r.getCell(5).value = item.materialsCost;
      r.getCell(6).value = item.laborEquipmentCost;
    }

    r.getCell(7).value = f(`E${rN}+F${rN}`, item.estimatedDirectCost);
    r.getCell(8).value = item.ocmPercent;            // OCM %
    r.getCell(9).value = item.profitPercent;          // PROFIT %
    r.getCell(10).value = f(`H${rN}+I${rN}`, item.totalMarkupPercent); // %
    r.getCell(11).value = f(`G${rN}*J${rN}/100`, item.markupValue);    // Value
    r.getCell(12).value = f(`(G${rN}+K${rN})*${vatPct}/100`, item.vatCost); // VAT
    r.getCell(13).value = f(`K${rN}+L${rN}`, item.totalIndirectCost);  // Total Indirect
    r.getCell(14).value = f(`(G${rN}+M${rN})*C${rN}`, item.totalCost); // Total Cost
    r.getCell(15).value = f(`IF(C${rN}=0,0,N${rN}/C${rN})`, item.unitCost); // Unit Cost

    for (let c = 1; c <= ABC_COLS; c++) {
      const cell = r.getCell(c);
      cell.font = { size: 9 };
      cell.border = THIN_BORDER;
      if (c === 1) cell.alignment = { horizontal: "center", vertical: "middle" };
      else if (c === 2) cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
      else if (c === 3 || c === 4) cell.alignment = { horizontal: "center", vertical: "middle" };
      else cell.alignment = { horizontal: "right", vertical: "middle" };
      if ([5, 6, 7, 11, 12, 13, 14, 15].includes(c)) cell.numFmt = "#,##0.00";
      if ([8, 9, 10].includes(c)) cell.numFmt = "0\"%\"";
      if (c === 3) cell.numFmt = "#,##0.##";
    }

    const totalRef = `N${rN}`;
    rowIdx++;
    allLeafTotalRefs.push(totalRef);
    return { totalRef, total: item.totalCost || 0 };
  };

  const writeCategoryHeader = (item: ABCItem) => {
    const r = abcWs.getRow(rowIdx);
    r.getCell(1).value = item.itemNo;
    r.getCell(2).value = item.description;
    abcWs.mergeCells(rowIdx, 2, rowIdx, ABC_COLS);
    for (let c = 1; c <= ABC_COLS; c++) {
      const cell = r.getCell(c);
      cell.font = { bold: true, size: 10, color: { argb: ABC_CATEGORY_TEXT } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ABC_CATEGORY_FILL } };
      cell.alignment = { vertical: "middle", horizontal: c === 1 ? "center" : "left" };
      cell.border = THIN_BORDER;
    }
    r.height = 20;
    rowIdx++;
  };

  
  
  const writeSubtotal = (totalRefs: string[], total: number) => {
    const r = abcWs.getRow(rowIdx);
    abcWs.mergeCells(rowIdx, 1, rowIdx, 13);
    r.getCell(1).value = "SUBTOTAL";
    const formula = totalRefs.length > 0 ? totalRefs.join("+") : "0";
    r.getCell(14).value = f(formula, total);
    for (let c = 1; c <= ABC_COLS; c++) {
      const cell = r.getCell(c);
      cell.font = { bold: true, size: 10, color: { argb: ABC_SUBTOTAL_TEXT } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ABC_SUBTOTAL_FILL } };
      cell.alignment = { horizontal: "right", vertical: "middle" };
      cell.border = THIN_BORDER;
    }
    r.getCell(14).numFmt = "#,##0.00";
    r.height = 18;
    rowIdx++;
  };

  const walk = (item: ABCItem): { refs: string[]; total: number } => {
    if (!item.isCategory) {
      const { totalRef, total } = writeLeaf(item);
      return { refs: [totalRef], total };
    }
    writeCategoryHeader(item);
    const collected: string[] = [];
    let sum = 0;
    for (const child of childrenOf(item.id)) {
      const res = walk(child);
      collected.push(...res.refs);
      sum += res.total;
    }
    writeSubtotal(collected, sum);
    return { refs: collected, total: sum };
  };

  let grandTotal = 0;
  for (const root of childrenOf(null)) {
    const res = walk(root);
    grandTotal += res.total;
  }

  
  if (allLeafTotalRefs.length > 0) {
    const r = abcWs.getRow(rowIdx);
    abcWs.mergeCells(rowIdx, 1, rowIdx, 13);
    r.getCell(1).value = "GRAND TOTAL";
    r.getCell(14).value = f(allLeafTotalRefs.join("+"), grandTotal);
    r.getCell(14).numFmt = "#,##0.00";
    for (let c = 1; c <= ABC_COLS; c++) {
      const cell = r.getCell(c);
      cell.font = { bold: true, size: 12, color: { argb: ABC_GRANDTOTAL_TEXT } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ABC_GRANDTOTAL_FILL } };
      cell.alignment = { horizontal: "right", vertical: "middle" };
      cell.border = THIN_BORDER;
    }
    r.height = 24;
    rowIdx++;
  }

  return wb;
}

const PROJECT_PAYLOAD_SHEET = "_APP_PROJECT";
const PROJECT_PAYLOAD_VERSION = 1;

interface ProjectPayload {
  v: number;
  exportedAt: string;
  abcItems: ABCItem[];
  dupaItems: DUPAItem[];
}

function injectProjectPayload(wb: ExcelJS.Workbook, project: Project) {
  const payload: ProjectPayload = {
    v: PROJECT_PAYLOAD_VERSION,
    exportedAt: new Date().toISOString(),
    abcItems: project.abcItems,
    dupaItems: project.dupaItems,
  };
  const ws = wb.addWorksheet(PROJECT_PAYLOAD_SHEET, { state: "veryHidden" });
  ws.getCell("A1").value = "DO NOT EDIT — App project payload";
  const json = JSON.stringify(payload);
  const CHUNK = 30000;
  for (let i = 0, row = 2; i < json.length; i += CHUNK, row++) {
    ws.getCell(`A${row}`).value = json.substring(i, i + CHUNK);
  }
}

async function readProjectPayload(buf: ArrayBuffer): Promise<ProjectPayload | null> {
  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const ws = wb.getWorksheet(PROJECT_PAYLOAD_SHEET);
    if (!ws) return null;
    let json = "";
    let row = 2;
    while (true) {
      const v = ws.getCell(`A${row}`).value;
      if (v == null || v === "") break;
      json += String(v);
      row++;
      if (row > 100000) break;
    }
    if (!json) return null;
    const p = JSON.parse(json) as ProjectPayload;
    if (!p || p.v !== PROJECT_PAYLOAD_VERSION || !Array.isArray(p.abcItems)) return null;
    return p;
  } catch {
    return null;
  }
}

export async function exportProjectToExcel(project: Project) {
  const wb = await buildProjectWorkbook(project);
  injectProjectPayload(wb, project);
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.name}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function parseCur(val: any): number {
  if (typeof val === "number") return val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[₱,\s]/g, "");
  return parseFloat(cleaned) || 0;
}

/** Clean floating point item numbers like 1.2000000000000002 → "1.2" */
function cleanItemNo(val: any): string {
  if (!val && val !== 0) return "";
  const s = String(val).trim();
  // If it's a number with floating point issues, round the last part
  const num = parseFloat(s);
  if (!isNaN(num)) {
    const parts = s.split(".");
    if (parts.length === 2 && parts[1].length > 3) {
      // Floating point artifact - round to reasonable precision
      const rounded = Math.round(num * 1000) / 1000;
      return String(rounded);
    }
  }
  return s;
}

/** Find the first row that looks like actual data (has item number + description) after header */
function findDataStartRow(rows: any[][], headerRow: number): number {
  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const first = String(row[0] || "").trim();
    const second = String(row[1] || "").trim();
    // Skip sub-header rows (numbered columns like "1", "2", "3"... or formula references)
    if (first === "" && !second) continue;
    if (/^\d+$/.test(first) && /^\d+$/.test(String(row[2] || "").trim()) && !second) continue;
    if (second.startsWith("(") && second.includes(")")) continue; // formula reference rows like "(3)+(4)"
    // If the row has both item number and description, this is data
    if (first && second && second.length > 2) return r;
    // If it's just a category number with description
    if ((parseFloat(first) > 0 || /^\d/.test(first)) && second) return r;
  }
  return headerRow + 1;
}

export function importExcelToProject(file: File): Promise<{ abcItems: ABCItem[]; dupaItems: DUPAItem[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuf = e.target!.result as ArrayBuffer;

        // ── Fast path: lossless JSON payload (any file exported by us) ──
        const payload = await readProjectPayload(arrayBuf);
        if (payload) {
          // Regenerate ids so re-imports never collide if the user imports
          // the same file twice into the same project later.
          const idMap = new Map<string, string>();
          for (const it of payload.abcItems) idMap.set(it.id, crypto.randomUUID());
          const abcItems: ABCItem[] = payload.abcItems.map((it, idx) => ({
            ...it,
            id: idMap.get(it.id)!,
            parentId: it.parentId ? (idMap.get(it.parentId) ?? null) : null,
            children: (it.children ?? []).map((c) => idMap.get(c)).filter((x): x is string => !!x),
            order: idx,
            hasDupa: false,
          }));
          const dupaItems: DUPAItem[] = [];
          for (const d of payload.dupaItems) {
            const newAbcId = idMap.get(d.abcItemId);
            if (!newAbcId) continue;
            const target = abcItems.find((a) => a.id === newAbcId);
            if (!target) continue;
            target.hasDupa = true;
            dupaItems.push(recalcDupa({
              ...d,
              id: crypto.randomUUID(),
              abcItemId: newAbcId,
              materials: d.materials.map((m) => ({ ...m, id: crypto.randomUUID() })),
              labor: d.labor.map((l) => ({ ...l, id: crypto.randomUUID() })),
              equipment: d.equipment.map((eq) => ({ ...eq, id: crypto.randomUUID() })),
            }));
          }
          // Recalc non-category ABC items so totals stay consistent.
          for (let i = 0; i < abcItems.length; i++) {
            if (!abcItems[i].isCategory) abcItems[i] = recalcABCItem(abcItems[i]);
          }
          resolve({ abcItems, dupaItems });
          return;
        }

        // ── Fallback: parse the human-readable sheets ──
        const data = new Uint8Array(arrayBuf);
        const wb = XLSX.read(data, { type: "array", cellFormula: true });

        const abcItems: ABCItem[] = [];
        const dupaItems: DUPAItem[] = [];

        
        const abcSheet = wb.Sheets[wb.SheetNames[0]];
        if (abcSheet) {
          const rows: any[][] = XLSX.utils.sheet_to_json(abcSheet, { header: 1 });
          
          
          let headerIdx = -1;
          for (let r = 0; r < Math.min(30, rows.length); r++) {
            const row = rows[r];
            if (!row) continue;
            const joined = row.map((v: any) => String(v || "").toUpperCase()).join("|");
            if (joined.includes("ITEM NO") && joined.includes("DESCRIPTION")) {
              headerIdx = r;
              break;
            }
          }
          if (headerIdx < 0) headerIdx = 2;

          
          const dataStart = findDataStartRow(rows, headerIdx);

          for (let i = dataStart; i < rows.length; i++) {
            const row = rows[i];
            if (!row) continue;
            
            const rawItemNo = cleanItemNo(row[0]);
            const description = String(row[1] || "").trim();
            
            // Skip completely empty rows
            if (!rawItemNo && !description) continue;
            
            // Skip SUB TOTAL / GRAND TOTAL rows (check all cells)
            const rowStr = row.map((v: any) => String(v || "").toUpperCase()).join("|");
            if (rowStr.includes("SUB TOTAL") || rowStr.includes("SUBTOTAL") || 
                rowStr.includes("GRAND TOTAL") || rowStr.includes("TOTAL PROJECT")) continue;
            
            
            if (!rawItemNo) continue;

            const qty = parseCur(row[2]);
            const unit = String(row[3] || "").trim();
            
            // Category detection: no qty/unit, or description but no numeric data in cost columns
            const hasCostData = parseCur(row[4]) > 0 || parseCur(row[5]) > 0 || parseCur(row[6]) > 0;
            const isCategory = (!qty && !unit) || (!qty && !hasCostData && !!description);

            const item: ABCItem = {
              id: crypto.randomUUID(),
              itemNo: rawItemNo,
              description,
              quantity: qty,
              unit,
              materialsCost: parseCur(row[4]),
              laborEquipmentCost: parseCur(row[5]),
              estimatedDirectCost: parseCur(row[6]),
              ocmPercent: parseCur(row[7]),
              profitPercent: parseCur(row[8]),
              totalMarkupPercent: parseCur(row[9]),
              markupValue: parseCur(row[10]),
              vatPercent: 5, // Default DPWH VAT
              vatCost: parseCur(row[11]),
              totalIndirectCost: parseCur(row[12]),
              totalCost: parseCur(row[13]),
              unitCost: parseCur(row[14]),
              isCategory,
              parentId: null,
              children: [],
              hasDupa: false,
              order: abcItems.length,
            };
            
            // Recalculate if it's not a category to ensure consistency
            if (!isCategory) {
              abcItems.push(recalcABCItem(item));
            } else {
              abcItems.push(item);
            }
          }

          // Auto-detect parent-child from item numbers (supports multi-level nesting)
          for (const item of abcItems) {
            const parts = item.itemNo.split(".");
            if (parts.length > 1) {
              const parentNo = parts.slice(0, -1).join(".");
              const parent = abcItems.find((p) => p.itemNo === parentNo);
              if (parent) {
                item.parentId = parent.id;
                parent.children.push(item.id);
                // Ensure parents are marked as categories
                if (!parent.isCategory) {
                  parent.isCategory = true;
                  // Reset cost fields for newly-identified categories
                  parent.materialsCost = 0;
                  parent.laborEquipmentCost = 0;
                  parent.estimatedDirectCost = 0;
                  parent.totalCost = 0;
                  parent.unitCost = 0;
                  parent.quantity = 0;
                }
              }
            }
          }
        }

        // === Parse DUPA Sheets ===
        // DUPA sheets can be named by item number (e.g., "3.1.3") or "DUPA xxx"
        for (let si = 1; si < wb.SheetNames.length; si++) {
          const sheetName = wb.SheetNames[si].trim();
          
          
          const matchingAbc = abcItems.find((a) => 
            a.itemNo === sheetName || 
            a.itemNo === sheetName.replace(/\s+/g, "") ||
            sheetName.toUpperCase().startsWith("DUPA") && sheetName.includes(a.itemNo)
          );

          
          const ws = wb.Sheets[wb.SheetNames[si]];
          const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
          if (rows.length < 5) continue;

          
          const sheetFormulas: Record<string, string> = {};
          for (const cellAddr of Object.keys(ws)) {
            if (cellAddr.startsWith("!")) continue;
            const cell = ws[cellAddr];
            if (cell && cell.f) sheetFormulas[cellAddr] = cell.f;
          }

          
          let hasASection = false, hasBSection = false, hasCSection = false;
          let hasDUPAHeader = false;
          for (let r = 0; r < Math.min(10, rows.length); r++) {
            const joined = (rows[r] || []).map((v: any) => String(v || "").toUpperCase()).join("|");
            if (joined.includes("DETAILED UNIT PRICE") || joined.includes("DUPA")) hasDUPAHeader = true;
          }
          for (let r = 0; r < rows.length; r++) {
            const first = String(rows[r]?.[0] || "").trim().toUpperCase();
            if (first === "A." || first === "A") hasASection = true;
            if (first === "B." || first === "B") hasBSection = true;
            if (first === "C." || first === "C") hasCSection = true;
          }

          const isDupaSheet = matchingAbc || hasDUPAHeader || (hasASection && hasBSection);
          if (!isDupaSheet) continue;

          
          let dupaDesc = "";
          let dupaQty = 0;
          let dupaUnit = "";
          let dupaItemNo = sheetName.replace(/\s+/g, "");
          let qtyRow = -1;
          let qtyCol = -1;

          // Search header area for item info
          for (let r = 0; r < Math.min(20, rows.length); r++) {
            const row = rows[r];
            if (!row) continue;
            
            for (let c = 0; c < row.length; c++) {
              const cell = String(row[c] || "").trim().toLowerCase();
              if ((cell === "qty." || cell === "qty" || cell === "quantity") && c === 2) {
                for (let dr = r + 1; dr < Math.min(r + 10, rows.length); dr++) {
                  const dRow = rows[dr];
                  if (!dRow) continue;
                  const first = String(dRow[0] || "").trim().toUpperCase();
                  if (first === "A." || first === "ITEM NO." || first === "ITEM NO") continue;
                  if (dRow[c] != null && parseCur(dRow[c]) > 0 && dRow[1]) {
                    dupaQty = parseCur(dRow[c]);
                    qtyRow = dr;
                    qtyCol = c;
                    dupaDesc = String(dRow[1]).trim();
                    if (dRow[3]) dupaUnit = String(dRow[3]).trim();
                    if (dRow[0]) dupaItemNo = cleanItemNo(dRow[0]);
                    break;
                  }
                }
                break;
              }
            }
            
            const firstCell = String(row[0] || "");
            const itemMatch = firstCell.match(/Item:\s*(.+?)\s*[—–-]\s*(.+)/i);
            if (itemMatch) {
              dupaItemNo = itemMatch[1].trim();
              dupaDesc = itemMatch[2].trim();
            }
            const qtyMatch = firstCell.match(/Quantity:\s*([\d.,]+)\s*(.*)/i);
            if (qtyMatch) {
              dupaQty = parseFloat(qtyMatch[1]) || 0;
              dupaUnit = qtyMatch[2].trim();
            }
          }

          // First pass: build rowMap for formula conversion
          const rowMap = new Map<number, { section: "A" | "B" | "C"; index: number }>();
          let section: "none" | "materials" | "labor" | "equipment" = "none";
          let matIdx = 0, labIdx = 0, eqIdx = 0;
          const materialRows: number[] = [];
          const laborRows: number[] = [];
          const equipmentRows: number[] = [];

          for (let r = 0; r < rows.length; r++) {
            const row = rows[r];
            if (!row || row.length === 0) continue;
            const firstCell = String(row[0] || "").trim().toUpperCase();
            const secondCell = String(row[1] || "").trim().toUpperCase();

            if (firstCell === "A." || (secondCell.includes("MATERIAL") && (firstCell === "A." || firstCell === "A"))) {
              section = "materials"; continue;
            }
            if (firstCell === "B." || (secondCell.includes("LABOR") && (firstCell === "B." || firstCell === "B"))) {
              section = "labor"; continue;
            }
            if (firstCell === "C." || (secondCell.includes("EQUIPMENT") && (firstCell === "C." || firstCell === "C"))) {
              section = "equipment"; continue;
            }

            if (firstCell.startsWith("(D)") || firstCell.startsWith("(E)") || firstCell.startsWith("(F)") ||
                firstCell.startsWith("(G)") || firstCell.startsWith("(H)") ||
                firstCell.includes("TOTAL DIRECT") || firstCell.includes("INDIRECT COST") ||
                firstCell.includes("UNIT PRICE") || firstCell.includes("VALUE ADDED")) {
              section = "none"; continue;
            }

            if (secondCell === "DESCRIPTION" || secondCell === "JOB TYPE" || secondCell === "EQUIPMENT UTILIZED" ||
                firstCell === "ITEM NO." || firstCell === "ITEM NO") continue;
            if (secondCell.includes("TOTAL COST") || secondCell.includes("SUBTOTAL")) continue;

            const desc = String(row[1] || "").trim();
            if (!desc) continue;
            if (section === "none") continue;

            if (section === "materials") {
              rowMap.set(r, { section: "A", index: matIdx });
              materialRows.push(r);
              matIdx++;
            } else if (section === "labor") {
              rowMap.set(r, { section: "B", index: labIdx });
              laborRows.push(r);
              labIdx++;
            } else if (section === "equipment") {
              rowMap.set(r, { section: "C", index: eqIdx });
              equipmentRows.push(r);
              eqIdx++;
            }
          }

          
          const convertDupaFormula = (cellAddr: string): string => {
            const excelFormula = sheetFormulas[cellAddr];
            if (!excelFormula) return "";
            let formula = excelFormula;
            if (formula.startsWith("=")) formula = formula.substring(1);
            
            // Remove external workbook/sheet references
            formula = formula.replace(/'\[.*?\].*?'![A-Z]+\d+/gi, "0");
            formula = formula.replace(/'[^']*'![A-Z]+\d+/gi, "0");
            
            
            const cellRefPattern = /\$?([A-Z])\$?(\d+)/gi;
            const replacements: { original: string; replacement: string; start: number; end: number }[] = [];
            let m;
            while ((m = cellRefPattern.exec(formula)) !== null) {
              const col = m[1].toUpperCase();
              const excelRow = parseInt(m[2], 10) - 1;
              const colIdx = col.charCodeAt(0) - 65;
              const original = m[0];
              
              
              if (excelRow === qtyRow && colIdx === qtyCol) {
                replacements.push({ original, replacement: "qty", start: m.index, end: m.index + original.length });
                continue;
              }
              
              
              const mapped = rowMap.get(excelRow);
              if (mapped && colIdx === 2) {
                replacements.push({
                  original,
                  replacement: `${mapped.section}${mapped.index + 1}`,
                  start: m.index,
                  end: m.index + original.length,
                });
                continue;
              }
            }
            
            replacements.sort((a, b) => b.start - a.start);
            for (const rep of replacements) {
              formula = formula.substring(0, rep.start) + rep.replacement + formula.substring(rep.end);
            }
            
            
            if (/[A-Z]\d+/i.test(formula) && !/\b[ABC]\d+\b/i.test(formula.replace(/\bqty\b/gi, ""))) {
              return "";
            }
            
            return formula;
          };

          // Second pass: build items with formulas
          const materials: MaterialItem[] = [];
          const labor: LaborItem[] = [];
          const equipment: EquipmentItem[] = [];

          for (const r of materialRows) {
            const row = rows[r];
            const qtyCellAddr = XLSX.utils.encode_cell({ r, c: 2 });
            const quantityFormula = convertDupaFormula(qtyCellAddr);
            materials.push({
              id: crypto.randomUUID(),
              description: String(row[1] || "").trim(),
              quantity: parseCur(row[2]),
              unit: String(row[3] || "").trim(),
              unitCost: parseCur(row[4]),
              totalCost: parseCur(row[5]),
              ...(quantityFormula ? { quantityFormula } : {}),
            });
          }

          for (const r of laborRows) {
            const row = rows[r];
            const mdCellAddr = XLSX.utils.encode_cell({ r, c: 2 });
            const manDaysFormula = convertDupaFormula(mdCellAddr);
            labor.push({
              id: crypto.randomUUID(),
              description: String(row[1] || "").trim(),
              manDays: parseCur(row[2]),
              wageRate: parseCur(row[4]),
              totalCost: parseCur(row[5]),
              ...(manDaysFormula ? { manDaysFormula } : {}),
            });
          }

          for (const r of equipmentRows) {
            const row = rows[r];
            const pCellAddr = XLSX.utils.encode_cell({ r, c: 2 });
            const periodFormula = convertDupaFormula(pCellAddr);
            equipment.push({
              id: crypto.randomUUID(),
              description: String(row[1] || "").trim(),
              period: parseCur(row[2]),
              rate: parseCur(row[4]),
              totalCost: parseCur(row[5]),
              ...(periodFormula ? { periodFormula } : {}),
            });
          }

          // Only create DUPA if we found actual items
          if (materials.length === 0 && labor.length === 0 && equipment.length === 0) continue;

          // Detect indirect cost & VAT from summary
          let indirectCostPercent = 25;
          let vatPercent = 5;
          for (let r = 0; r < rows.length; r++) {
            const cell = String(rows[r]?.[0] || "").trim().toUpperCase();
            const fAddrE = XLSX.utils.encode_cell({ r, c: 4 });
            const fAddrF = XLSX.utils.encode_cell({ r, c: 5 });
            
            if (cell.includes("INDIRECT") || cell.includes("OCM")) {
              if (sheetFormulas[fAddrE]) {
                const pctMatch = sheetFormulas[fAddrE].match(/([\d.]+)\s*\*/);
                if (pctMatch) indirectCostPercent = parseFloat(pctMatch[1]) * 100;
              } else if (sheetFormulas[fAddrF]) {
                const pctMatch = sheetFormulas[fAddrF].match(/([\d.]+)\s*\*/);
                if (pctMatch) indirectCostPercent = parseFloat(pctMatch[1]) * 100;
              } else {
                const pctMatch = cell.match(/([\d.]+)\s*%/);
                if (pctMatch) indirectCostPercent = parseFloat(pctMatch[1]) || 25;
              }
            }
            if (cell.includes("VALUE ADDED TAX") || cell.includes("VAT")) {
              if (sheetFormulas[fAddrF]) {
                const pctMatch = sheetFormulas[fAddrF].match(/\*\s*([\d.]+)/);
                if (pctMatch) vatPercent = parseFloat(pctMatch[1]) * 100;
                
                const pctMatch2 = sheetFormulas[fAddrF].match(/([\d.]+)%/);
                if (pctMatch2) vatPercent = parseFloat(pctMatch2[1]);
              } else {
                const pctMatch = cell.match(/([\d.]+)\s*%/);
                if (pctMatch) vatPercent = parseFloat(pctMatch[1]) || 5;
              }
            }
          }

          const abcMatch = matchingAbc || abcItems.find((a) => a.itemNo === dupaItemNo);

          const dupaItem: DUPAItem = {
            id: crypto.randomUUID(),
            abcItemId: abcMatch?.id || "",
            itemNo: dupaItemNo,
            description: dupaDesc || abcMatch?.description || sheetName,
            quantity: dupaQty || abcMatch?.quantity || 0,
            unit: dupaUnit || abcMatch?.unit || "",
            materials: ensureMinimumDupaRows(materials, 5, createDefaultMaterial),
            labor: ensureMinimumDupaRows(labor, 5, createDefaultLabor),
            equipment: ensureMinimumDupaRows(equipment, 5, createDefaultEquipment),
            totalMaterials: 0, totalLabor: 0, totalEquipment: 0,
            totalDirectCost: 0, indirectCostPercent, indirectCost: 0,
            totalDirectAndIndirect: 0, vatPercent, vat: 0,
            totalPrice: 0, unitPrice: 0,
          };
          
          
          dupaItems.push(recalcDupa(dupaItem));

          if (abcMatch) {
            abcMatch.hasDupa = true;
          }
        }

        resolve({ abcItems, dupaItems });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function getOrderedItems(items: ABCItem[]): ABCItem[] {
  const sorted = [...items].sort((a, b) => a.order - b.order);
  const ordered: ABCItem[] = [];
  const addWithChildren = (parentId: string | null) => {
    sorted.filter((i) => i.parentId === parentId).forEach((i) => {
      ordered.push(i);
      if (i.isCategory || i.children.length > 0) addWithChildren(i.id);
    });
  };
  addWithChildren(null);
  items.forEach((i) => { if (!ordered.find((o) => o.id === i.id)) ordered.push(i); });
  return ordered;
}
