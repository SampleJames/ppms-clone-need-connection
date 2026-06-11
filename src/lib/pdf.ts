import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Project, ABCItem, DUPAItem } from "@/types";
import { formatCurrency } from "./calculations";
import {
  renderPdfHeader,
  renderPdfSignatories,
  resolveDocSettings,
  ensureRoomForSignatories,
} from "./printSettings";
import { sanitizeAutoTableCell, sanitizePdfText } from "./pdfText";
import { sortByItemNo } from "./utils";

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

export interface AbcPdfColors {
  abcHeaderBg: string;
  abcHeaderText: string;
  abcCategoryBg: string;
  abcCategoryText: string;
  abcSubtotalBg: string;
  abcSubtotalText: string;
  abcGrandTotalBg: string;
  abcGrandTotalText: string;
}

export const DEFAULT_ABC_COLORS: AbcPdfColors = {
  abcHeaderBg: "#FFFFFF",
  abcHeaderText: "#000000",
  abcCategoryBg: "#92D050",
  abcCategoryText: "#000000",
  abcSubtotalBg: "#FFFF00",
  abcSubtotalText: "#000000",
  abcGrandTotalBg: "#FFA500",
  abcGrandTotalText: "#000000",
};

export const ABC_COLUMNS_FULL = [
  { key: "itemNo", label: "Item No.", default: true },
  { key: "description", label: "Description", default: true },
  { key: "quantity", label: "Qty", default: true },
  { key: "unit", label: "Unit", default: true },
  { key: "materialsCost", label: "Materials", default: true },
  { key: "laborEquipmentCost", label: "Labor & Equip", default: true },
  { key: "estimatedDirectCost", label: "Est. Direct Cost", default: true },
  { key: "ocmPercent", label: "OCM %", default: true },
  { key: "profitPercent", label: "Profit %", default: true },
  { key: "totalMarkupPercent", label: "Markup %", default: true },
  { key: "markupValue", label: "Markup Value", default: true },
  { key: "vatCost", label: "VAT", default: true },
  { key: "totalIndirectCost", label: "Total Indirect", default: true },
  { key: "totalCost", label: "Total Cost", default: true },
  { key: "unitCost", label: "Unit Cost", default: true },
];

export const ABC_COLUMNS_SIMPLE = [
  { key: "itemNo", label: "Item No.", default: true },
  { key: "description", label: "Description", default: true },
  { key: "quantity", label: "Qty", default: true },
  { key: "unit", label: "Unit", default: true },
  { key: "materialsCost", label: "Materials", default: true },
  { key: "laborEquipmentCost", label: "Labor & Equip", default: true },
  { key: "estimatedDirectCost", label: "Est. Direct Cost", default: true },
  { key: "ocmPercent", label: "OCM %", default: true },
  { key: "profitPercent", label: "Profit %", default: true },
  { key: "totalMarkupPercent", label: "Markup %", default: true },
  { key: "markupValue", label: "Markup Value", default: true },
  { key: "vatPercent", label: "VAT %", default: true },
  { key: "vatCost", label: "VAT", default: true },
  { key: "totalIndirectCost", label: "Total Indirect", default: true },
  { key: "totalCost", label: "Total Cost", default: true },
  { key: "unitCost", label: "Unit Cost", default: true },
];

export const DEFAULT_ABC_FORMULAS: Record<string, string> = {
  estimatedDirectCost: "(3)+(4)",
  totalMarkupPercent: "(6)+(7)",
  markupValue: "(5) x (8)",
  vatCost: "5% x ((5)+(9))",
  totalIndirectCost: "(9)+(10)",
  totalCost: "(5+11) x (1)",
  unitCost: "(12) / (1)",
};

export interface AbcPdfOptions {
  visibleColumnKeys?: Set<string>;
  excludedRowIds?: Set<string>;
  formulas?: Record<string, string>;
  simpleVersion?: boolean;
  colors?: AbcPdfColors;
  showBorders?: boolean;
  printSettings?: ReturnType<typeof resolveDocSettings>;
  title?: string;
}

export function generateAbcPdf(project: Project, opts: AbcPdfOptions = {}): jsPDF {
  const simpleVersion = opts.simpleVersion ?? false;
  const columnsActive = simpleVersion ? ABC_COLUMNS_SIMPLE : ABC_COLUMNS_FULL;
  const visible = opts.visibleColumnKeys ?? new Set(columnsActive.map((c) => c.key));
  const excluded = opts.excludedRowIds ?? new Set<string>();
  const formulas = { ...DEFAULT_ABC_FORMULAS, ...(opts.formulas ?? {}) };
  const colors = opts.colors ?? DEFAULT_ABC_COLORS;
  const showBorders = opts.showBorders ?? true;
  const ps = opts.printSettings ?? resolveDocSettings(project, "abc");
  const title = opts.title ?? "APPROVED BUDGET FOR THE CONTRACT";

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
  const cols = columnsActive.filter((c) => visible.has(c.key));
  const orderedItems = getOrderedItems(project.abcItems);
  const rows = orderedItems.filter((i) => !excluded.has(i.id));

  doc.setFontSize(14);
  const headerY = renderPdfHeader(doc, { title, project, settings: ps });

  const NUMBER_MAP: Record<string, string> = {
    quantity: "1", unit: "2", materialsCost: "3", laborEquipmentCost: "4",
    estimatedDirectCost: "5", ocmPercent: "6", profitPercent: "7",
    totalMarkupPercent: "8", markupValue: "9", vatCost: "10",
    totalIndirectCost: "11", totalCost: "12", unitCost: "13",
  };

  const row1: any[] = [];
  const row2: any[] = [];
  const fItalic = { fontStyle: "italic" as const, fontSize: 6 };
  const blankHeadCell = { content: "", styles: { fillColor: hexToRgb(colors.abcHeaderBg) } };
  const row3: any[] = [];
  const row4: any[] = [];

  let ci = 0;
  while (ci < cols.length) {
    const c = cols[ci];
    const next = cols[ci + 1];
    const isMarkupPctGroup = c.key === "ocmPercent" && next?.key === "profitPercent";
    const isMarkupValGroup = c.key === "totalMarkupPercent" && next?.key === "markupValue";
    if (isMarkupPctGroup) {
      row1.push({ content: "MARK-UPS IN PERCENT", colSpan: 2 });
      row2.push("OCM", "PROFIT");
      ci += 2;
    } else if (isMarkupValGroup) {
      row1.push({ content: "TOTAL MARK-UP", colSpan: 2 });
      row2.push("%", "Value");
      ci += 2;
    } else {
      row1.push({ content: c.label, rowSpan: 2 });
      ci += 1;
    }
  }
  for (const c of cols) {
    row3.push(NUMBER_MAP[c.key] ?? (c.key === "itemNo" || c.key === "description" ? blankHeadCell : ""));
    const f = formulas[c.key];
    row4.push(f ? { content: f, styles: fItalic }
      : (c.key === "itemNo" || c.key === "description" ? blankHeadCell : ""));
  }

  const head: any[][] = simpleVersion
    ? [cols.map((c) => c.label)]
    : [row1, row2, row3, row4];

  const bodyWithSubtotals: any[][] = [];
  let i = 0;
  while (i < rows.length) {
    const item = rows[i];
    if (item.isCategory) {
      bodyWithSubtotals.push(cols.map((c) => {
        if (c.key === "itemNo") return { content: item.itemNo, styles: { fontStyle: "bold", fillColor: hexToRgb(colors.abcCategoryBg), textColor: hexToRgb(colors.abcCategoryText) } };
        if (c.key === "description") return { content: item.description, styles: { fontStyle: "bold", fillColor: hexToRgb(colors.abcCategoryBg), textColor: hexToRgb(colors.abcCategoryText) } };
        return { content: "", styles: { fillColor: hexToRgb(colors.abcCategoryBg) } };
      }));
      let j = i + 1;
      while (j < rows.length && rows[j].parentId === item.id && !rows[j].isCategory) {
        const child = rows[j];
        bodyWithSubtotals.push(cols.map((c) => {
          const val = (child as any)[c.key];
          if (c.key === "itemNo" || c.key === "description" || c.key === "unit") return val;
          if (c.key === "quantity") return val;
          if (c.key.includes("Percent")) return `${val}%`;
          return formatCurrency(val);
        }));
        j++;
      }
      const catTotal = getCategoryTotal(item.id, project.abcItems);
      const totalCostIdx = cols.findIndex((c) => c.key === "totalCost");
      const tiIdx = cols.findIndex((c) => c.key === "totalIndirectCost");
      const labelStart = tiIdx >= 0 ? tiIdx : Math.max(0, totalCostIdx - 1);
      const labelSpan = Math.max(1, totalCostIdx - labelStart);
      const subtotalRow: any[] = [];
      if (labelStart > 0) subtotalRow.push({ content: "", colSpan: labelStart });
      subtotalRow.push({ content: "SUBTOTAL", colSpan: labelSpan, styles: { fontStyle: "bold", halign: "right" as const, fillColor: hexToRgb(colors.abcSubtotalBg), textColor: hexToRgb(colors.abcSubtotalText) } });
      subtotalRow.push({ content: formatCurrency(catTotal), styles: { fontStyle: "bold", halign: "right" as const, fillColor: hexToRgb(colors.abcSubtotalBg), textColor: hexToRgb(colors.abcSubtotalText) } });
      const trailing = cols.length - totalCostIdx - 1;
      if (trailing > 0) subtotalRow.push({ content: "", colSpan: trailing });
      bodyWithSubtotals.push(subtotalRow);
      i = j;
    } else {
      bodyWithSubtotals.push(cols.map((c) => {
        const val = (item as any)[c.key];
        if (c.key === "itemNo" || c.key === "description" || c.key === "unit") return val;
        if (c.key === "quantity") return val;
        if (c.key.includes("Percent")) return `${val}%`;
        return formatCurrency(val);
      }));
      i++;
    }
  }

  const grandTotal = project.abcItems
    .filter((it) => it.isCategory && !it.parentId)
    .reduce((s, it) => s + getCategoryTotal(it.id, project.abcItems), 0) +
    project.abcItems
      .filter((it) => !it.isCategory && !it.parentId)
      .reduce((s, it) => s + it.totalCost, 0);

  const descIdx = cols.findIndex((c) => c.key === "description");
  const gtTotalCostIdx = cols.findIndex((c) => c.key === "totalCost");
  const firstSpan = descIdx >= 0 ? descIdx + 1 : 1;
  const middleSpan = Math.max(1, gtTotalCostIdx - firstSpan + 1);
  const grandTotalRow: any[] = [
    { content: "GRAND TOTAL", colSpan: firstSpan, styles: { fontStyle: "bold", halign: "right" as const } },
    { content: formatCurrency(grandTotal), colSpan: middleSpan, styles: { fontStyle: "bold", halign: "right" as const, fillColor: hexToRgb(colors.abcGrandTotalBg), textColor: hexToRgb(colors.abcGrandTotalText) } },
  ];
  const gtTrailing = cols.length - (firstSpan + middleSpan);
  if (gtTrailing > 0) grandTotalRow.push({ content: "", colSpan: gtTrailing });
  bodyWithSubtotals.push(grandTotalRow);

  const borderStyles = showBorders
    ? { lineColor: [0, 0, 0] as [number, number, number], lineWidth: 0.1 }
    : {};

  autoTable(doc, {
    startY: headerY,
    margin: { top: 14, bottom: 14, left: 14, right: 14 },
    didDrawPage: () => {
      renderPdfHeader(doc, { title, project, settings: ps });
    },
    didParseCell: sanitizeAutoTableCell,
    theme: "grid",
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.1,
    head,
    body: bodyWithSubtotals,
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      overflow: "linebreak",
      valign: "top",
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      ...borderStyles,
    },
    headStyles: {
      fillColor: hexToRgb(colors.abcHeaderBg),
      textColor: hexToRgb(colors.abcHeaderText),
      fontSize: 7,
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      halign: "center",
      valign: "middle",
    },
    bodyStyles: { lineColor: [0, 0, 0], lineWidth: 0.1 },
    columnStyles: {
      1: { cellWidth: 90, overflow: "linebreak", valign: "top" },
    },
  });

  ensureRoomForSignatories(doc, { title, project, settings: ps });
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    renderPdfSignatories(doc, project, ps);
  }
  return doc;
}

export function exportABCToPDF(project: Project) {
  const doc = generateAbcPdf(project);
  doc.save(`${project.name} - ABC.pdf`);
}

export function exportDUPAToPDF(project: Project, dupaItem?: DUPAItem) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const items = dupaItem ? [dupaItem] : sortByItemNo(project.dupaItems);
  
  
  
  
  const reserve = 38;

  
  
  const COL = { itemNo: 12, desc: 64, qty: 20, unit: 14, rate: 32, total: 40 };
  const TABLE_W = COL.itemNo + COL.desc + COL.qty + COL.unit + COL.rate + COL.total;
  const MARGIN_L = 14;
  const MARGIN_R = 14;

  
  const GREY_LIGHT: [number, number, number] = [217, 217, 217]; 
  const GREY_MED: [number, number, number] = [165, 165, 165];   
  const BLACK: [number, number, number] = [0, 0, 0];
  const WHITE: [number, number, number] = [255, 255, 255];

  const renderDupaHeader = (): number => {
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.text("[Bidder's Letterhead]", pageWidth / 2, 14, { align: "center" });
    doc.text("[Date]", pageWidth - MARGIN_R, 22, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const nameLine = `Name of Contract/Project: ${sanitizePdfText(project.name || "")}`;
    const locLine = `Location: ${sanitizePdfText(project.location || "")}`;
    doc.text(nameLine, MARGIN_L, 30);
    doc.text(locLine, MARGIN_L, 36);
    return 42;
  };

  const renderDupaSignatories = () => {
    const pageHeight = doc.internal.pageSize.getHeight();
    const rightBlockStart = MARGIN_L + COL.itemNo + COL.desc;
    const rightBlockEnd = MARGIN_L + TABLE_W;
    const xCenter = (rightBlockStart + rightBlockEnd) / 2;
    const baseY = pageHeight - 28;
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("[Signature]", xCenter, baseY, { align: "center" });
    doc.text("[Name of Authorized Representative]", xCenter, baseY + 6, { align: "center" });
    doc.text("[Title/Position]", xCenter, baseY + 12, { align: "center" });
  };

  const baseStyles = {
    fontSize: 7.5,
    overflow: "linebreak" as const,
    valign: "middle" as const,
    cellPadding: { top: 1, right: 1.5, bottom: 1, left: 1.5 },
    lineColor: BLACK,
    lineWidth: 0.2,
    textColor: BLACK,
  };
  const plainHeadStyles = {
    fillColor: WHITE,
    textColor: BLACK,
    fontStyle: "normal" as const,
    halign: "center" as const,
    valign: "middle" as const,
    lineColor: BLACK,
    lineWidth: 0.2,
  };
  const sixColColumnStyles = {
    0: { cellWidth: COL.itemNo, halign: "center" as const, valign: "middle" as const },
    1: { cellWidth: COL.desc, overflow: "linebreak" as const, valign: "middle" as const },
    2: { cellWidth: COL.qty, halign: "center" as const, valign: "middle" as const, overflow: "visible" as const },
    3: { cellWidth: COL.unit, halign: "center" as const, valign: "middle" as const, overflow: "visible" as const },
    4: { cellWidth: COL.rate, halign: "right" as const, valign: "middle" as const, overflow: "visible" as const },
    5: { cellWidth: COL.total, halign: "right" as const, valign: "middle" as const, overflow: "visible" as const },
  };
  const tableMargin = { top: 14, bottom: reserve, left: MARGIN_L, right: MARGIN_R };

  items.forEach((dupa, idx) => {
    if (idx > 0) doc.addPage();

    const headerEnd = renderDupaHeader();

    const abcItem = project.abcItems.find((i) => i.id === dupa.abcItemId);
    const parentCategory = abcItem?.parentId
      ? project.abcItems.find((i) => i.id === abcItem.parentId && i.isCategory)
      : undefined;

    const titleHead: any[][] = [
      [{
        content: "Detailed Unit Price Analysis",
        colSpan: 6,
        styles: { halign: "center", fontStyle: "bold", fontSize: 12, fillColor: WHITE, textColor: BLACK },
      }],
      [
        { content: "" },
        { content: "" },
        { content: "Qty.", styles: { halign: "center" } },
        { content: "Unit", styles: { halign: "center" } },
        { content: "Unit Price", styles: { halign: "center" } },
        { content: "Total Price", styles: { halign: "center" } },
      ],
    ];
    const titleBody: any[][] = [];
    if (parentCategory) {
      titleBody.push([
        { content: parentCategory.itemNo || "", styles: { fontStyle: "bold", fillColor: GREY_LIGHT } },
        { content: parentCategory.description || "", colSpan: 5, styles: { fontStyle: "bold", fillColor: GREY_LIGHT } },
      ]);
    }
    titleBody.push([
      { content: dupa.itemNo || "", styles: { fontStyle: "bold", fillColor: GREY_LIGHT } },
      { content: dupa.description || "", styles: { fontStyle: "bold", fillColor: GREY_LIGHT } },
      { content: dupa.quantity, styles: { fillColor: GREY_LIGHT, halign: "center" } },
      { content: dupa.unit, styles: { fillColor: GREY_LIGHT, halign: "center" } },
      { content: formatCurrency(dupa.unitPrice), styles: { fillColor: GREY_LIGHT, halign: "right" } },
      { content: formatCurrency(dupa.totalPrice), styles: { fillColor: GREY_LIGHT, halign: "right" } },
    ]);

    autoTable(doc, {
      startY: headerEnd,
      margin: tableMargin,
      didParseCell: sanitizeAutoTableCell,
      theme: "grid",
      head: titleHead,
      body: titleBody,
      styles: { ...baseStyles, fontSize: 11 },
      headStyles: plainHeadStyles,
      columnStyles: sixColColumnStyles,
    });

    let y = (doc as any).lastAutoTable.finalY;

    const renderSection = (
      letter: string,
      sectionLabel: string,
      colHeaders: [string, string, string, string],
      rows: { desc: string; qty: number | string; unit: string; rate: number; total: number }[],
      subtotalLabel: string,
      subtotal: number,
    ) => {
      const body: any[][] = [];
      body.push([
        { content: letter, styles: { fontStyle: "bold" } },
        { content: sectionLabel, colSpan: 5, styles: { fontStyle: "bold" } },
      ]);
      body.push([
        { content: "Item No.", styles: { halign: "center" } },
        { content: "Description", styles: { halign: "center" } },
        { content: colHeaders[0], styles: { halign: "center" } },
        { content: colHeaders[1], styles: { halign: "center" } },
        { content: colHeaders[2], styles: { halign: "center" } },
        { content: colHeaders[3], styles: { halign: "center" } },
      ]);
      const total = Math.max(rows.length, 1);
      for (let i = 0; i < total; i++) {
        const r = rows[i];
        body.push([
          { content: i + 1 },
          { content: r ? r.desc : "" },
          { content: r ? r.qty : "" },
          { content: r ? r.unit : "" },
          { content: r ? formatCurrency(r.rate) : "" },
          { content: r ? formatCurrency(r.total) : "" },
        ]);
      }
      body.push([
        { content: "" },
        { content: subtotalLabel, colSpan: 4, styles: { halign: "left" } },
        { content: formatCurrency(subtotal), styles: { halign: "right" } },
      ]);

      autoTable(doc, {
        startY: y,
        margin: tableMargin,
        didParseCell: sanitizeAutoTableCell,
        theme: "grid",
        body,
        styles: baseStyles,
        columnStyles: sixColColumnStyles,
      });
      y = (doc as any).lastAutoTable.finalY;
    };

    renderSection(
      "A.",
      "Materials",
      ["Qty.", "Unit", "Unit Cost", "Total Cost"],
      dupa.materials.map((m) => ({
        desc: m.description, qty: m.quantity, unit: m.unit, rate: m.unitCost, total: m.totalCost,
      })),
      "(a) Total Cost of Materials",
      dupa.totalMaterials,
    );

    renderSection(
      "B.",
      "Labor",
      ["Man-Hours", "", "Wage Rate", "Total Cost"],
      dupa.labor.map((l) => ({
        desc: l.description, qty: l.manDays, unit: "", rate: l.wageRate, total: l.totalCost,
      })),
      "(b) Total Cost of Labor",
      dupa.totalLabor,
    );

    renderSection(
      "C.",
      "Equipment Utilization",
      ["Utilization Period", "", "Utilization Rate", "Total Cost"],
      dupa.equipment.map((e) => ({
        desc: e.description, qty: e.period, unit: "", rate: e.rate, total: e.totalCost,
      })),
      "(c) Total Cost for Equipment Utilization",
      dupa.totalEquipment,
    );

    const summaryRows: { label: string; value: number; greyValue?: boolean }[] = [
      { label: "(d) Total Direct Costs = (a) + (b) + (c)", value: dupa.totalDirectCost, greyValue: true },
      { label: `(e) Indirect Costs: OCM and Profit (${dupa.indirectCostPercent}%)`, value: dupa.indirectCost, greyValue: true },
      { label: "(f) Total Direct and Indirect Costs = (d) + (e)", value: dupa.totalDirectAndIndirect },
      { label: `(g) Value Added Tax (${dupa.vatPercent}%)`, value: dupa.vat },
      { label: "(h) Total Price", value: dupa.totalPrice },
    ];
    const summaryBody: any[][] = summaryRows.map((r) => [
      { content: r.label, styles: { halign: "left" } },
      { content: formatCurrency(r.value), styles: { halign: "right", fillColor: r.greyValue ? GREY_MED : WHITE } },
    ]);

    autoTable(doc, {
      startY: y,
      margin: tableMargin,
      didParseCell: sanitizeAutoTableCell,
      theme: "grid",
      body: summaryBody,
      styles: baseStyles,
      columnStyles: {
        0: { cellWidth: COL.itemNo + COL.desc + COL.qty + COL.unit + COL.rate, overflow: "linebreak" as const },
        1: { cellWidth: COL.total, halign: "right" as const, overflow: "visible" as const },
      },
    });
  });

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    renderDupaSignatories();
  }
  const filename = dupaItem
    ? `DUPA ${dupaItem.itemNo} - ${dupaItem.description}.pdf`
    : `${project.name} - All DUPA.pdf`;
  doc.save(filename);
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

function getCategoryTotal(catId: string, items: ABCItem[]): number {
  return items
    .filter((i) => i.parentId === catId && !i.isCategory)
    .reduce((sum, i) => sum + i.totalCost, 0) +
    items
      .filter((i) => i.parentId === catId && i.isCategory)
      .reduce((sum, i) => sum + getCategoryTotal(i.id, items), 0);
}
