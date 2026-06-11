import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { PriceListYear, PriceListCategory, PriceListItem } from "@/types";

const HEADER_ROW = ["Description", "Specification 1", "Specification 2", "Unit", "Market Price", "w/ Mark-up"];

function parseNum(v: unknown): number {
  if (v == null || v === "" || v === "-") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/[,₱$\s]/g, "");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function s(v: unknown): string {
  if (v == null) return "";
  const str = String(v).trim();
  return str === "-" ? "" : str;
}

export async function exportPriceListYearToExcel(year: PriceListYear) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Pricelist");
  ws.columns = [
    { width: 38 }, { width: 24 }, { width: 18 }, { width: 10 }, { width: 14 }, { width: 14 },
  ];

  const thinBorder = {
    top: { style: "thin" as const, color: { argb: "FF000000" } },
    left: { style: "thin" as const, color: { argb: "FF000000" } },
    bottom: { style: "thin" as const, color: { argb: "FF000000" } },
    right: { style: "thin" as const, color: { argb: "FF000000" } },
  };

  const sortedCats = [...year.categories].sort((a, b) => a.order - b.order);
  let rowIdx = 1;

  sortedCats.forEach((cat, idx) => {
    
    const catRow = ws.getRow(rowIdx);
    catRow.getCell(1).value = "Category";
    catRow.getCell(2).value = cat.name;
    ws.mergeCells(rowIdx, 2, rowIdx, 6);
    for (let c = 1; c <= 6; c++) {
      const cell = catRow.getCell(c);
      cell.font = { bold: true, size: 11, color: { argb: "FF000000" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
      cell.alignment = { vertical: "middle" };
      cell.border = thinBorder;
    }
    rowIdx++;

    
    const hdrRow = ws.getRow(rowIdx);
    HEADER_ROW.forEach((h, i) => {
      const cell = hdrRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, size: 11 };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = thinBorder;
    });
    rowIdx++;

    
    const catItems = year.items.filter((i) => i.categoryId === cat.id);
    catItems.forEach((it) => {
      const dr = ws.getRow(rowIdx);
      dr.getCell(1).value = it.description || "";
      dr.getCell(2).value = it.extraDesc1 || "-";
      dr.getCell(3).value = it.extraDesc2 || "-";
      dr.getCell(4).value = it.unit || "";
      dr.getCell(5).value = it.marketPrice || 0;
      dr.getCell(6).value = it.markupPrice || 0;
      for (let c = 1; c <= 6; c++) {
        const cell = dr.getCell(c);
        cell.font = { size: 11 };
        cell.alignment = {
          vertical: "middle",
          horizontal: c === 4 ? "center" : c >= 5 ? "right" : undefined,
        };
        cell.border = thinBorder;
        if (c >= 5) cell.numFmt = "#,##0";
      }
      rowIdx++;
    });

    if (idx < sortedCats.length - 1) rowIdx++; 
  });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Pricelist-${year.year}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ImportResult {
  categories: PriceListCategory[];
  items: PriceListItem[];
  importedCount: number;
}

export async function importPriceListFromExcel(file: File): Promise<ImportResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  const categories: PriceListCategory[] = [];
  const items: PriceListItem[] = [];
  let currentCatId: string | null = null;
  let order = 0;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] || [];
    const first = s(row[0]);
    const second = s(row[1]);
    if (!first && !second) continue;

    // Category marker row
    if (first.toLowerCase() === "category") {
      const name = second || `Category ${order + 1}`;
      const cat: PriceListCategory = { id: crypto.randomUUID(), name, order: order++ };
      categories.push(cat);
      currentCatId = cat.id;
      continue;
    }
    
    if (first.toLowerCase() === "description") continue;

    
    if (!currentCatId) {
      
      const cat: PriceListCategory = { id: crypto.randomUUID(), name: "Imported", order: order++ };
      categories.push(cat);
      currentCatId = cat.id;
    }
    const desc = first;
    if (!desc) continue;
    items.push({
      id: crypto.randomUUID(),
      description: desc,
      extraDesc1: s(row[1]),
      extraDesc2: s(row[2]),
      unit: s(row[3]),
      marketPrice: parseNum(row[4]),
      markupPrice: parseNum(row[5]),
      categoryId: currentCatId,
    });
  }

  return { categories, items, importedCount: items.length };
}
