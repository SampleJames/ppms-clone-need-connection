import * as XLSX from "xlsx";
import { MaterialItem, LaborItem, EquipmentItem } from "@/types";
import { createDefaultEquipment, createDefaultLabor, createDefaultMaterial, ensureMinimumDupaRows } from "@/lib/dupaDefaults";

export interface ImportedDupaData {
  name: string;
  description: string;
  unit: string;
  quantity: number;
  materials: MaterialItem[];
  labor: LaborItem[];
  equipment: EquipmentItem[];
  indirectCostPercent: number;
  vatPercent: number;
  outOfScopeRefs: string[];
}

function parseCurrency(val: any): number {
  if (typeof val === "number") return val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[₱,\s]/g, "");
  return parseFloat(cleaned) || 0;
}

function extractFormulas(ws: XLSX.WorkSheet): Record<string, string> {
  const formulas: Record<string, string> = {};
  if (!ws) return formulas;
  for (const cellAddr of Object.keys(ws)) {
    if (cellAddr.startsWith("!")) continue;
    const cell = ws[cellAddr];
    if (cell && cell.f) {
      formulas[cellAddr] = cell.f;
    }
  }
  return formulas;
}

/** Check if a row is a subtotal/summary row that should be skipped */
function isSummaryRow(row: any[]): boolean {
  const first = String(row[0] || "").trim().toUpperCase();
  const second = String(row[1] || "").trim().toUpperCase();
  
  if (first.startsWith("(") && /^\([A-Z]\)/.test(first)) return true;
  if (second.includes("TOTAL COST") || second.includes("SUBTOTAL")) return true;
  if (first.includes("TOTAL DIRECT") || first.includes("INDIRECT COST") ||
      first.includes("UNIT PRICE") || first.includes("VALUE ADDED") ||
      first.includes("TOTAL PRICE")) return true;
  return false;
}

function isHeaderRow(row: any[]): boolean {
  const first = String(row[0] || "").trim().toUpperCase();
  const second = String(row[1] || "").trim().toUpperCase();
  return second === "DESCRIPTION" || second === "JOB TYPE" || second === "EQUIPMENT UTILIZED" ||
    first === "ITEM NO." || first === "ITEM NO";
}

function convertFormula(
  excelFormula: string,
  qtyRow: number,
  qtyCol: number,
  rowMap: Map<number, { section: "A" | "B" | "C"; index: number }>
): { formula: string; outOfScope: string[] } {
  if (!excelFormula) return { formula: "", outOfScope: [] };
  
  const outOfScope: string[] = [];
  let formula = excelFormula;
  
  // Remove leading = if present
  if (formula.startsWith("=")) formula = formula.substring(1);
  
  // Remove external workbook references like '[1]ABC  (LOCKER)'!B55
  // These are out of scope
  const extRefPattern = /'\[.*?\].*?'![A-Z]+\d+/gi;
  const extMatches = formula.match(extRefPattern);
  if (extMatches) {
    extMatches.forEach(ref => outOfScope.push(ref));
    formula = formula.replace(extRefPattern, "0");
  }
  
  
  
  const cellRefPattern = /\$?([A-Z])\$?(\d+)/gi;
  const replacements: { original: string; replacement: string; start: number; end: number }[] = [];
  
  let match;
  while ((match = cellRefPattern.exec(formula)) !== null) {
    const col = match[1].toUpperCase();
    const row = parseInt(match[2], 10);
    const colIdx = col.charCodeAt(0) - 65; 
    const original = match[0];
    
    
    if (row === qtyRow + 1 && colIdx === qtyCol) { 
      replacements.push({ original, replacement: "qty", start: match.index, end: match.index + original.length });
      continue;
    }
    
    
    
    
    
    const excelRow = row - 1; 
    const mapped = rowMap.get(excelRow);
    if (mapped) {
      let suffix = "";
      if (colIdx === 2) {
        suffix = "";
      } else if (colIdx === 4) {
        suffix = mapped.section === "A" ? ".u" : mapped.section === "B" ? ".w" : ".r";
      } else if (colIdx === 5) {
        suffix = ".t";
      } else {
        
        outOfScope.push(original);
        continue;
      }
      replacements.push({
        original,
        replacement: `${mapped.section}${mapped.index + 1}${suffix}`,
        start: match.index,
        end: match.index + original.length,
      });
      continue;
    }

    
    if (colIdx > 2) {
      outOfScope.push(original);
    }
  }
  
  
  replacements.sort((a, b) => b.start - a.start);
  for (const rep of replacements) {
    formula = formula.substring(0, rep.start) + rep.replacement + formula.substring(rep.end);
  }
  
  return { formula, outOfScope };
}

export function importDupaFromExcel(file: File): Promise<ImportedDupaData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellFormula: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const formulas = extractFormulas(ws);

        
        let description = "";
        let unit = "";
        let quantity = 0;
        let qtyRow = -1; // 0-indexed row of the qty value
        let qtyCol = -1;

        for (let r = 0; r < Math.min(20, rows.length); r++) {
          const row = rows[r];
          if (!row) continue;
          for (let c = 0; c < row.length; c++) {
            const cell = String(row[c] || "").trim().toLowerCase();
            if ((cell === "qty." || cell === "qty" || cell === "quantity") && c === 2) {
              
              for (let dr = r + 1; dr < Math.min(r + 10, rows.length); dr++) {
                const drRow = rows[dr];
                if (!drRow) continue;
                const firstCell = String(drRow[0] || "").trim().toUpperCase();
                // Skip section headers (A., B., C.) and sub-headers
                if (firstCell === "A." || firstCell === "B." || firstCell === "C." ||
                    firstCell === "ITEM NO." || firstCell === "ITEM NO") continue;
                if (drRow[c] != null && parseCurrency(drRow[c]) > 0) {
                  quantity = parseCurrency(drRow[c]);
                  qtyRow = dr;
                  qtyCol = c;
                  
                  if (drRow[1]) description = String(drRow[1]).trim();
                  if (drRow[3]) unit = String(drRow[3]).trim();
                  break;
                }
              }
            }
          }
          if (qtyRow >= 0) break;
        }

        
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

          // Detect section headers
          if (firstCell === "A." || (secondCell.includes("MATERIAL") && (firstCell === "A." || firstCell === "A"))) {
            section = "materials";
            continue;
          }
          if (firstCell === "B." || (secondCell.includes("LABOR") && (firstCell === "B." || firstCell === "B"))) {
            section = "labor";
            continue;
          }
          if (firstCell === "C." || (secondCell.includes("EQUIPMENT") && (firstCell === "C." || firstCell === "C"))) {
            section = "equipment";
            continue;
          }

          if (isSummaryRow(row)) { section = "none"; continue; }
          if (isHeaderRow(row)) continue;
          if (section === "none") continue;

          const desc = String(row[1] || "").trim();
          if (!desc) continue;

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

        
        const materials: MaterialItem[] = [];
        const labor: LaborItem[] = [];
        const equipment: EquipmentItem[] = [];
        const allOutOfScope: string[] = [];

        for (const r of materialRows) {
          const row = rows[r];
          const desc = String(row[1] || "").trim();
          const qtyCellAddr = XLSX.utils.encode_cell({ r, c: 2 });
          const ucCellAddr = XLSX.utils.encode_cell({ r, c: 4 });
          let quantityFormula = "";
          let unitCostFormula = "";

          if (formulas[qtyCellAddr]) {
            const result = convertFormula(formulas[qtyCellAddr], qtyRow, qtyCol, rowMap);
            quantityFormula = result.formula;
            allOutOfScope.push(...result.outOfScope);
          }
          if (formulas[ucCellAddr]) {
            const result = convertFormula(formulas[ucCellAddr], qtyRow, qtyCol, rowMap);
            unitCostFormula = result.formula;
            allOutOfScope.push(...result.outOfScope);
          }

          materials.push({
            id: crypto.randomUUID(),
            description: desc,
            quantity: parseCurrency(row[2]),
            unit: String(row[3] || "").trim(),
            unitCost: parseCurrency(row[4]),
            totalCost: parseCurrency(row[5]),
            quantityFormula,
            unitCostFormula,
          });
        }

        for (const r of laborRows) {
          const row = rows[r];
          const desc = String(row[1] || "").trim();
          const mdCellAddr = XLSX.utils.encode_cell({ r, c: 2 });
          const wrCellAddr = XLSX.utils.encode_cell({ r, c: 4 });
          let manDaysFormula = "";
          let wageRateFormula = "";

          if (formulas[mdCellAddr]) {
            const result = convertFormula(formulas[mdCellAddr], qtyRow, qtyCol, rowMap);
            manDaysFormula = result.formula;
            allOutOfScope.push(...result.outOfScope);
          }
          if (formulas[wrCellAddr]) {
            const result = convertFormula(formulas[wrCellAddr], qtyRow, qtyCol, rowMap);
            wageRateFormula = result.formula;
            allOutOfScope.push(...result.outOfScope);
          }

          labor.push({
            id: crypto.randomUUID(),
            description: desc,
            manDays: parseCurrency(row[2]),
            wageRate: parseCurrency(row[4]),
            totalCost: parseCurrency(row[5]),
            manDaysFormula,
            wageRateFormula,
          });
        }

        for (const r of equipmentRows) {
          const row = rows[r];
          const desc = String(row[1] || "").trim();
          const pCellAddr = XLSX.utils.encode_cell({ r, c: 2 });
          const rateCellAddr = XLSX.utils.encode_cell({ r, c: 4 });
          let periodFormula = "";
          let rateFormula = "";

          if (formulas[pCellAddr]) {
            const result = convertFormula(formulas[pCellAddr], qtyRow, qtyCol, rowMap);
            periodFormula = result.formula;
            allOutOfScope.push(...result.outOfScope);
          }
          if (formulas[rateCellAddr]) {
            const result = convertFormula(formulas[rateCellAddr], qtyRow, qtyCol, rowMap);
            rateFormula = result.formula;
            allOutOfScope.push(...result.outOfScope);
          }

          equipment.push({
            id: crypto.randomUUID(),
            description: desc,
            period: parseCurrency(row[2]),
            rate: parseCurrency(row[4]),
            totalCost: parseCurrency(row[5]),
            periodFormula,
            rateFormula,
          });
        }
        // --- Detect indirect cost & VAT percent ---
        let indirectCostPercent = 16;
        let vatPercent = 5;
        for (let r = 0; r < rows.length; r++) {
          const cell = String(rows[r]?.[0] || "").trim().toUpperCase();
          const fAddr = XLSX.utils.encode_cell({ r, c: 4 }); // Column E
          
          if (cell.includes("INDIRECT") || cell.includes("OCM")) {
            
            if (formulas[fAddr]) {
              const f = formulas[fAddr];
              const pctMatch = f.match(/([\d.]+)\s*\*/);
              if (pctMatch) {
                indirectCostPercent = parseFloat(pctMatch[1]) * 100;
              }
            } else {
              const pctMatch = cell.match(/([\d.]+)\s*%/);
              if (pctMatch) indirectCostPercent = parseFloat(pctMatch[1]) || 16;
            }
          }
          if (cell.includes("VALUE ADDED TAX") || cell.includes("VAT")) {
            const fAddrF = XLSX.utils.encode_cell({ r, c: 5 });
            if (formulas[fAddrF]) {
              const f = formulas[fAddrF];
              const pctMatch = f.match(/\*\s*([\d.]+)/);
              if (pctMatch) {
                vatPercent = parseFloat(pctMatch[1]) * 100;
              }
            } else {
              const pctMatch = cell.match(/([\d.]+)\s*%/);
              if (pctMatch) vatPercent = parseFloat(pctMatch[1]) || 5;
            }
          }
        }

        const uniqueOutOfScope = [...new Set(allOutOfScope)];
        const name = description || "Imported DUPA";

        resolve({
          name,
          description,
          unit,
          quantity,
          materials: ensureMinimumDupaRows(materials, 5, createDefaultMaterial),
          labor: ensureMinimumDupaRows(labor, 5, createDefaultLabor),
          equipment: ensureMinimumDupaRows(equipment, 5, createDefaultEquipment),
          indirectCostPercent,
          vatPercent,
          outOfScopeRefs: uniqueOutOfScope,
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
