import jsPDF from "jspdf";
import {
  Project,
  PrintSettings,
  DEFAULT_PRINT_SETTINGS,
  HAlign,
  PrintDocType,
  PrintProfiles,
  DEFAULT_PRINT_PROFILES,
  ElementLayout,
  Signatory,
  SignatoryPerson,
} from "@/types";
import { getAppSettings, saveAppSettings } from "./storage";

export function getSignatoryPeople(s: Signatory): SignatoryPerson[] {
  if (s.people && s.people.length) return s.people;
  const names = (s.name || "").split(/\r?\n/).map((n) => n.trim()).filter(Boolean);
  if (names.length === 0) return [{ name: "", position: s.position || "" }];
  return names.map((n) => ({ name: n, position: s.position || "" }));
}

/** Read the global print settings (from AppSettings). */
export function getGlobalPrintSettings(): PrintSettings {
  const app = getAppSettings();
  return { ...DEFAULT_PRINT_SETTINGS, ...(app.printSettings || {}) };
}

/** Persist global print settings. */
export function saveGlobalPrintSettings(ps: PrintSettings) {
  const app = getAppSettings();
  saveAppSettings({ ...app, printSettings: ps });
  window.dispatchEvent(new Event("settingsChanged"));
}

export function resolvePrintSettings(project?: Project | null): PrintSettings {
  const global = getGlobalPrintSettings();
  if (!project?.printOverride) return global;
  const merged: PrintSettings = { ...global, ...project.printOverride };
  if (project.printOverride.signatories) merged.signatories = project.printOverride.signatories;
  if (project.printOverride.orgLines) merged.orgLines = project.printOverride.orgLines;
  return merged;
}

export function getGlobalPrintProfiles(): PrintProfiles {
  const app = getAppSettings();
  const legacy = app.printSettings || DEFAULT_PRINT_SETTINGS;
  const stored = app.printProfiles || {};
  return {
    abc: { ...DEFAULT_PRINT_PROFILES.abc, ...legacy, ...(stored.abc || {}) },
    dupa: { ...DEFAULT_PRINT_PROFILES.dupa, ...legacy, ...(stored.dupa || {}) },
    boq: { ...DEFAULT_PRINT_PROFILES.boq, ...legacy, ...(stored.boq || {}) },
    scurve: { ...DEFAULT_PRINT_PROFILES.scurve, ...legacy, ...(stored.scurve || {}) },
  };
}

export function saveGlobalPrintProfile(docType: PrintDocType, ps: PrintSettings) {
  const app = getAppSettings();
  const next: PrintProfiles = { ...getGlobalPrintProfiles(), [docType]: ps };
  saveAppSettings({ ...app, printProfiles: next });
  window.dispatchEvent(new Event("settingsChanged"));
}

export function resolveDocSettings(
  project: Project | null | undefined,
  docType: PrintDocType
): PrintSettings {
  const globalProfile = getGlobalPrintProfiles()[docType];
  const override = project?.printProfileOverrides?.[docType];
  if (!override) return globalProfile;
  const merged: PrintSettings = { ...globalProfile, ...override };
  if (override.signatories) merged.signatories = override.signatories;
  if (override.orgLines) merged.orgLines = override.orgLines;
  return merged;
}

export const DOC_PAGE: Record<PrintDocType, { orientation: "portrait" | "landscape"; format: "a4" | "legal"; label: string }> = {
  abc: { orientation: "landscape", format: "legal", label: "ABC" },
  dupa: { orientation: "portrait", format: "a4", label: "DUPA" },
  boq: { orientation: "landscape", format: "legal", label: "BOQ" },
  scurve: { orientation: "landscape", format: "legal", label: "S-Curve" },
};

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function anchorX(pageWidth: number, layout: { xMm: number; align: HAlign }, marginL = 14, marginR = 14): { x: number; align: HAlign } {
  if (layout.align === "left") return { x: marginL + layout.xMm, align: "left" };
  if (layout.align === "right") return { x: pageWidth - marginR - layout.xMm, align: "right" };
  return { x: pageWidth / 2 + layout.xMm, align: "center" };
}

function hexToRgbTuple(hex?: string): [number, number, number] {
  if (!hex || !/^#?[0-9a-fA-F]{6}$/.test(hex.replace("#", ""))) return [0, 0, 0];
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

interface RenderHeaderOptions {
  title: string;
  project?: Project | null;
  /** When provided, used instead of resolving from storage. Lets callers preview
   *  unsaved edits in the PDF. */
  settings?: PrintSettings;
}

/** Approx font size in mm (1pt ≈ 0.3528mm). */
const ptToMm = (pt: number) => pt * 0.3528;

/** Vertical space (mm) the signatory block needs at the bottom of a page.
 *  Used to reserve bottom margin for autoTable so tables paginate before
 *  reaching the signatory area, and to detect when we must push signatories
 *  to a fresh page. */
/** Normalize legacy signatory layouts/people into the new flat shape. */
export function normalizeSignatoryLayout(
  layout: PrintSettings["signatoriesLayout"]
): "default" | "detailed" {
  const v = layout as unknown as string | undefined;
  if (v === "stacked" || v === "row") return "detailed";
  if (v === "detailed") return "detailed";
  return "default";
}

export function normalizeSignatories(sigs: Signatory[] | undefined): Signatory[] {
  if (!sigs?.length) return [];
  const out: Signatory[] = [];
  sigs.forEach((s) => {
    if (s.people && s.people.length > 1) {
      s.people.forEach((p) => {
        out.push({ label: s.label, name: p.name, position: p.position, row: s.row ?? 0 });
      });
    } else {
      const p = s.people?.[0];
      out.push({
        label: s.label,
        name: p?.name ?? s.name ?? "",
        position: p?.position ?? s.position ?? "",
        row: s.row ?? 0,
      });
    }
  });
  return out;
}

const SIGNATORY_BOTTOM_TRIM_MM = 28;
const SIGNATORY_TOP_PAD_MM = 2;

function getEffectiveSignatoryBottomMm(ps: PrintSettings): number {
  const fromBottom = ps.signatoriesYFromBottomMm || 32;
  return Math.max(4, fromBottom - SIGNATORY_BOTTOM_TRIM_MM);
}

export function getSignatoriesReserveMm(ps: PrintSettings): number {
  const rawSigs = (ps.signatories || []).filter((s) => {
    if (s.label?.trim() || s.name?.trim() || s.position?.trim()) return true;
    return (s.people || []).some((p) => p.name?.trim() || p.position?.trim());
  });
  if (rawSigs.length === 0) return 14;
  const rowGap = ps.signatoryRowGapMm ?? 18;
  const lineOffset = ps.signatoryLineOffsetMm ?? 12;
  const tableGap = 1;
  const effectiveFromBottom = getEffectiveSignatoryBottomMm(ps);
  const layoutMode = normalizeSignatoryLayout(ps.signatoriesLayout);

  if (layoutMode === "default") {
    
    
    const lineH = 4.2;
    
    
    const labelToNameGap = Math.max(0, 2 + ((ps.signatoryLineOffsetMm ?? 12) - 12));
    const blockGap = Math.max(0, 10 + ((ps.signatoryRowGapMm ?? 18) - 18));
    const labelHeight = ptToMm(ps.signatoryLabelFontSize ?? 9);
    let total = 0;
    rawSigs.forEach((s) => {
      const people = getSignatoryPeople(s);
      const hasPos = people.some((p) => p.position?.trim());
      total += lineH + labelToNameGap + lineH + (hasPos ? lineH : 0);
    });
    total += blockGap * Math.max(0, rawSigs.length - 1);
    return effectiveFromBottom + total - lineH + labelHeight + tableGap + SIGNATORY_TOP_PAD_MM;
  }

  
  
  const sigs = normalizeSignatories(rawSigs);
  const rowsMap = new Map<number, typeof sigs>();
  sigs.forEach((s) => {
    const r = s.row ?? 0;
    if (!rowsMap.has(r)) rowsMap.set(r, []);
    rowsMap.get(r)!.push(s);
  });
  const rowKeys = Array.from(rowsMap.keys());
  const rowsCount = rowKeys.length || 1;
  const labelHeight = ptToMm(ps.signatoryLabelFontSize ?? 9);
  void lineOffset;
  return effectiveFromBottom + (rowsCount - 1) * rowGap + labelHeight + tableGap + SIGNATORY_TOP_PAD_MM;
}

export function ensureRoomForSignatories(
  doc: jsPDF,
  opts: { title: string; project?: Project | null; settings?: PrintSettings }
) {
  const ps = opts.settings ?? resolvePrintSettings(opts.project);
  const reserve = getSignatoriesReserveMm(ps);
  const pageHeight = doc.internal.pageSize.getHeight();
  const tableState = doc as jsPDF & { lastAutoTable?: { finalY?: number } };
  const lastY = tableState.lastAutoTable?.finalY ?? 0;
  const neededTop = pageHeight - reserve;
  
  if (lastY > neededTop) {
    doc.addPage();
  }
}

export interface HeaderLayout {
  marginL: number;
  marginR: number;
    logoTop: number;
  logo2Top: number;
  logo3Top: number;
    orgFirstBaseline: number;
    orgBottomBaseline: number;
    secondaryFirstBaseline: number;
    secondaryBottomBaseline: number;
    titleBaseline: number;
    projectInfoBaseline: number;
    dividerY: number;
    bodyTop: number;
  resolvedTitle: string;
}

export function computeHeaderLayout(
  ps: PrintSettings,
  pageWidth: number,
  defaultTitle: string,
  hasProject: boolean
): HeaderLayout {
  const marginL = ps.pageMarginLeftMm ?? 14;
  const marginR = ps.pageMarginRightMm ?? 14;
  const orgLines = (ps.orgLines || []).filter((l) => l.trim());
  const gap = ps.orgLineGapMm ?? 4;

  const logoTop = ps.logoLayout.yMm;
  const logo2Top = ps.logo2Layout?.yMm ?? 10;
  const logo3Top = ps.logo3Layout?.yMm ?? 10;
  const logoBottom = ps.logoDataUrl ? logoTop + (ps.logoWidthMm || 29) : 0;
  const logo2Bottom = ps.logo2DataUrl ? logo2Top + (ps.logo2WidthMm || 29) : 0;
  const logo3Bottom = ps.logo3DataUrl ? logo3Top + (ps.logo3WidthMm || 29) : 0;

  const orgFirstBaseline = ps.orgLayout.yMm;
  const totalOrgRows = orgLines.length + (ps.addressLine?.trim() ? 1 : 0);
  const orgBottomBaseline = orgFirstBaseline + Math.max(0, totalOrgRows) * gap;

  
  const sh = ps.secondaryHeader;
  const shLines = (sh?.orgLines || []).filter((l) => l.trim());
  const shGap = sh?.lineGapMm ?? 4;
  const secondaryFirstBaseline = sh?.enabled ? sh.layout.yMm : 0;
  const secondaryRows = sh?.enabled ? shLines.length + (sh.addressLine?.trim() ? 1 : 0) : 0;
  const secondaryBottomBaseline = sh?.enabled
    ? secondaryFirstBaseline + Math.max(0, secondaryRows) * shGap
    : 0;

  
  const addHeaders = (ps.additionalHeaders || []).filter((h) => h && h.enabled !== false);
  const addHeaderBottoms = addHeaders.map((h) => {
    const lines = (h.orgLines || []).filter((l) => l.trim());
    const rows = lines.length + (h.addressLine?.trim() ? 1 : 0);
    return h.layout.yMm + Math.max(0, rows) * (h.lineGapMm ?? 4);
  });

  
  const extraLogoBottoms = (ps.extraLogos || []).map((l) =>
    l.dataUrl ? l.layout.yMm + (l.widthMm || 22) : 0
  );

  const headerBottom = Math.max(
    logoBottom,
    logo2Bottom,
    logo3Bottom,
    orgBottomBaseline,
    secondaryBottomBaseline,
    ...extraLogoBottoms,
    ...addHeaderBottoms
  );
  const titleGap = ps.titleGapMm ?? 4;
  const titleBaseline = headerBottom + titleGap;

  const anyPIField =
    ps.projectInfoShowName !== false ||
    ps.projectInfoShowLocation !== false ||
    ps.projectInfoShowContractor !== false ||
    ps.projectInfoShowDate !== false;
  const showPI = ps.showProjectInfo && hasProject && anyPIField;
  const projectInfoBaseline = Math.max(titleBaseline + Math.min(titleGap, 6) + 1, ps.projectInfoLayout.yMm);
  let piMaxY = projectInfoBaseline;
  if (showPI && ps.projectInfoIndependentFields) {
    const ys = [
      ps.projectInfoShowName !== false ? ps.projectInfoNameLayout?.yMm : undefined,
      ps.projectInfoShowLocation !== false ? ps.projectInfoLocationLayout?.yMm : undefined,
      ps.projectInfoShowContractor !== false ? ps.projectInfoContractorLayout?.yMm : undefined,
      ps.projectInfoShowDate !== false ? ps.projectInfoDateLayout?.yMm : undefined,
    ].filter((n): n is number => typeof n === "number");
    if (ys.length) piMaxY = Math.max(piMaxY, ...ys);
  }
  const dividerY = showPI ? piMaxY + 5 : titleBaseline + Math.min(titleGap, 6) + 1;

  const bodyTop = dividerY + (ps.contentTopGapMm ?? 4);

  let resolvedTitle = ps.titleOverride?.trim() ? ps.titleOverride : defaultTitle;
  if (ps.titleUppercase) resolvedTitle = resolvedTitle.toUpperCase();

  return {
    marginL,
    marginR,
    logoTop,
    logo2Top,
    logo3Top,
    orgFirstBaseline,
    orgBottomBaseline,
    secondaryFirstBaseline,
    secondaryBottomBaseline,
    titleBaseline,
    projectInfoBaseline,
    dividerY,
    bodyTop,
    resolvedTitle,
  };
}

export function renderPdfHeader(doc: jsPDF, opts: RenderHeaderOptions): number {
  const ps = opts.settings ?? resolvePrintSettings(opts.project);
  const pageWidth = doc.internal.pageSize.getWidth();
  const layout = computeHeaderLayout(ps, pageWidth, opts.title, !!opts.project);
  const { marginL, marginR } = layout;

  
  const drawLogo = (dataUrl: string, widthMm: number, lay: ElementLayout, top: number) => {
    try {
      const fmt = dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
      const w = widthMm || 22;
      const lx =
        lay.align === "left"
          ? marginL + lay.xMm
          : lay.align === "right"
          ? pageWidth - marginR - lay.xMm - w
          : pageWidth / 2 + lay.xMm - w / 2;
      doc.addImage(dataUrl, fmt, lx, top, w, w);
    } catch {
      return;
    }
  };
  if (ps.logoDataUrl) drawLogo(ps.logoDataUrl, ps.logoWidthMm, ps.logoLayout, layout.logoTop);
  if (ps.logo2DataUrl && ps.logo2Layout)
    drawLogo(ps.logo2DataUrl, ps.logo2WidthMm ?? 29, ps.logo2Layout, layout.logo2Top);
  if (ps.logo3DataUrl && ps.logo3Layout)
    drawLogo(ps.logo3DataUrl, ps.logo3WidthMm ?? 29, ps.logo3Layout, layout.logo3Top);
  
  (ps.extraLogos || []).forEach((l) => {
    if (l.dataUrl) drawLogo(l.dataUrl, l.widthMm || 22, l.layout, l.layout.yMm);
  });

  
  const [orgR, orgG, orgB] = hexToRgbTuple(ps.orgTextColor || "#000000");
  doc.setTextColor(orgR, orgG, orgB);
  const orgLines = (ps.orgLines || []).filter((l) => l.trim());
  let orgY = layout.orgFirstBaseline;
  const { x: orgX, align: orgAlign } = anchorX(pageWidth, ps.orgLayout, marginL, marginR);
  const gap = ps.orgLineGapMm ?? 4;
  orgLines.forEach((line, idx) => {
    const styleOverride = ps.orgLineStyles?.[idx];
    
    const bold = styleOverride?.bold ?? (idx === 0);
    const italic = !!styleOverride?.italic;
    const fontStyle = bold && italic ? "bolditalic" : bold ? "bold" : italic ? "italic" : "normal";
    doc.setFont("helvetica", fontStyle);
    doc.setFontSize(idx === 0 ? ps.orgPrimaryFontSize ?? 10 : ps.orgSecondaryFontSize ?? 9);
    doc.text(line, orgX, orgY, { align: orgAlign });
    orgY += gap;
  });
  if (ps.addressLine?.trim()) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(ps.addressFontSize ?? 8);
    doc.text(ps.addressLine, orgX, orgY, { align: orgAlign });
  }

  
  const sh = ps.secondaryHeader;
  if (sh?.enabled) {
    const [sR, sG, sB] = hexToRgbTuple(sh.color || "#000000");
    doc.setTextColor(sR, sG, sB);
    const shLines = (sh.orgLines || []).filter((l) => l.trim());
    const { x: shX, align: shAlign } = anchorX(pageWidth, sh.layout, marginL, marginR);
    const shGap = sh.lineGapMm ?? 4;
    let shY = layout.secondaryFirstBaseline;
    shLines.forEach((line, idx) => {
      const so = sh.orgLineStyles?.[idx];
      const bold = so?.bold ?? (idx === 0);
      const italic = !!so?.italic;
      const fontStyle = bold && italic ? "bolditalic" : bold ? "bold" : italic ? "italic" : "normal";
      doc.setFont("helvetica", fontStyle);
      doc.setFontSize(idx === 0 ? sh.primaryFontSize ?? 9 : sh.secondaryFontSize ?? 8);
      doc.text(line, shX, shY, { align: shAlign });
      shY += shGap;
    });
    if (sh.addressLine?.trim()) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(sh.addressFontSize ?? 8);
      doc.text(sh.addressLine, shX, shY, { align: shAlign });
    }
  }

  
  (ps.additionalHeaders || []).forEach((h) => {
    if (!h || h.enabled === false) return;
    const [hR, hG, hB] = hexToRgbTuple(h.color || "#000000");
    doc.setTextColor(hR, hG, hB);
    const lines = (h.orgLines || []).filter((l) => l.trim());
    const { x: hx, align: hAlign } = anchorX(pageWidth, h.layout, marginL, marginR);
    const hGap = h.lineGapMm ?? 4;
    let hy = h.layout.yMm;
    lines.forEach((line, idx) => {
      const so = h.orgLineStyles?.[idx];
      const bold = so?.bold ?? (idx === 0);
      const italic = !!so?.italic;
      const fontStyle = bold && italic ? "bolditalic" : bold ? "bold" : italic ? "italic" : "normal";
      doc.setFont("helvetica", fontStyle);
      doc.setFontSize(idx === 0 ? h.primaryFontSize ?? 9 : h.secondaryFontSize ?? 8);
      const rendered = opts.project?.name
        ? line.replace(/\(Add Project Name\)/gi, opts.project.name)
        : line;
      doc.text(rendered, hx, hy, { align: hAlign });
      hy += hGap;
    });
  });

  
  const [tR, tG, tB] = hexToRgbTuple(ps.titleColor || "#000000");
  doc.setTextColor(tR, tG, tB);
  const titleStyle =
    ps.titleBold !== false && ps.titleItalic
      ? "bolditalic"
      : ps.titleBold !== false
      ? "bold"
      : ps.titleItalic
      ? "italic"
      : "normal";
  doc.setFont("helvetica", titleStyle);
  doc.setFontSize(ps.titleFontSize ?? 13);
  doc.text(layout.resolvedTitle, pageWidth / 2, layout.titleBaseline, { align: "center" });

  
  if (ps.showProjectInfo && opts.project) {
    const [pR, pG, pB] = hexToRgbTuple(ps.projectInfoColor || "#000000");
    doc.setTextColor(pR, pG, pB);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(ps.projectInfoFontSize ?? 9);
    const showName = ps.projectInfoShowName !== false;
    const showLoc = ps.projectInfoShowLocation !== false;
    const showCon = ps.projectInfoShowContractor !== false;
    const showDate = ps.projectInfoShowDate !== false;
    const projectName = ps.projectInfoNameOverride?.trim() || opts.project.name;
    const location = ps.projectInfoLocationOverride?.trim() || opts.project.location || ps.defaultLocation || "";
    const contractor = ps.projectInfoContractorOverride?.trim() || opts.project.contractor || ps.defaultContractor || "";
    const dateStr = ps.projectInfoDateOverride?.trim() || new Date().toLocaleDateString();
    if (ps.projectInfoIndependentFields) {
      const drawField = (text: string, lay: ElementLayout | undefined, fallbackY: number) => {
        const l = lay ?? { xMm: 14, yMm: fallbackY, align: "left" as HAlign };
        const { x, align } = anchorX(pageWidth, l, marginL, marginR);
        doc.text(text, x, l.yMm, { align });
      };
      if (showName) drawField(`Project: ${projectName}`, ps.projectInfoNameLayout, 36);
      if (showLoc && location) drawField(`Location: ${location}`, ps.projectInfoLocationLayout, 41);
      if (showCon && contractor) drawField(`Contractor: ${contractor}`, ps.projectInfoContractorLayout, 36);
      if (showDate) drawField(`Date: ${dateStr}`, ps.projectInfoDateLayout, 41);
    } else {
    const leftParts: string[] = [];
    if (showName) leftParts.push(`Project: ${projectName}`);
    if (showLoc && location) leftParts.push(`Location: ${location}`);
    const rightParts: string[] = [];
    if (showCon && contractor) rightParts.push(`Contractor: ${contractor}`);
    if (showDate) rightParts.push(`Date: ${dateStr}`);
    const left = leftParts.join("   |   ");
    const right = rightParts.join("   |   ");
    const piY = layout.projectInfoBaseline;
    const { x: piX, align: piAlign } = anchorX(pageWidth, ps.projectInfoLayout, marginL, marginR);
    if (piAlign === "left") {
      if (left) doc.text(left, piX, piY);
      if (right) doc.text(right, pageWidth - marginR, piY, { align: "right" });
    } else if (piAlign === "right") {
      doc.text(`${left}    ${right}`.trim(), piX, piY, { align: "right" });
    } else {
      doc.text(`${left}    ${right}`.trim(), piX, piY, { align: "center" });
    }
    }
  }

  
  if (ps.showHeaderDivider !== false) {
    const [dR, dG, dB] = hexToRgbTuple(ps.headerDividerColor || "#b4b4b4");
    doc.setDrawColor(dR, dG, dB);
    doc.setLineWidth(ps.headerDividerThicknessMm ?? 0.2);
    doc.line(marginL, layout.dividerY, pageWidth - marginR, layout.dividerY);
    doc.setDrawColor(0);
  }

  doc.setTextColor(0, 0, 0);
  return layout.bodyTop;
}

export function renderPdfSignatories(doc: jsPDF, project?: Project | null, settings?: PrintSettings) {
  const ps = settings ?? resolvePrintSettings(project);
  const layoutMode = normalizeSignatoryLayout(ps.signatoriesLayout);
  const rawSigs = (ps.signatories || []).filter((s) => {
    if (s.label?.trim() || s.name?.trim() || s.position?.trim()) return true;
    return (s.people || []).some((p) => p.name?.trim() || p.position?.trim());
  });
  if (rawSigs.length === 0) return;

  const pageCount = doc.getNumberOfPages();
  doc.setPage(pageCount);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginL = ps.pageMarginLeftMm ?? 14;
  const marginR = ps.pageMarginRightMm ?? 14;

  const align = ps.signatoriesAlign || "left";
  const sigBlockWidth = ps.signatoryBlockWidthMm ?? 60;
  const sigGap = ps.signatoryGapMm ?? 4;
  const rowGap = ps.signatoryRowGapMm ?? 18;
  const lineOffset = ps.signatoryLineOffsetMm ?? 12;
  const totalWidth = pageWidth - marginL - marginR;

  const [labR, labG, labB] = hexToRgbTuple(ps.signatoryLabelColor || "#505050");
  const [nmR, nmG, nmB] = hexToRgbTuple(ps.signatoryNameColor || "#000000");
  const [poR, poG, poB] = hexToRgbTuple(ps.signatoryPositionColor || "#505050");
  const [lnR, lnG, lnB] = hexToRgbTuple(ps.signatoryLineColor || "#787878");
  void lnR; void lnG; void lnB;

  if (layoutMode === "default") {
    
    const sigs = rawSigs;
    const labelSize = ps.signatoryLabelFontSize ?? 9;
    const nameSize = ps.signatoryNameFontSize ?? 10;
    const posSize = ps.signatoryPositionFontSize ?? 8;
    const lineH = 4.2;
    
    const blockGap = Math.max(0, 10 + (rowGap - 18));
    const labelToNameGap = Math.max(0, 2 + (lineOffset - 12));
    
    const peopleGap = sigGap;
    const personColW = sigBlockWidth;

    const blockHeights = sigs.map((s) => {
      const people = getSignatoryPeople(s);
      const hasPos = people.some((p) => p.position?.trim());
      return lineH + labelToNameGap + lineH + (hasPos ? lineH : 0);
    });
    const totalH = blockHeights.reduce((a, b) => a + b, 0) + blockGap * Math.max(0, sigs.length - 1);
    let y = pageHeight - getEffectiveSignatoryBottomMm(ps) - totalH + SIGNATORY_TOP_PAD_MM;

    sigs.forEach((sig, idx) => {
      const people = getSignatoryPeople(sig);
      const peopleCount = Math.max(1, people.length);
      
      const blockW = peopleCount * personColW + (peopleCount - 1) * peopleGap;

      
      let xStart: number;
      if (align === "right") {
        xStart = pageWidth - marginR - blockW;
      } else if (align === "center" || align === "justify") {
        xStart = marginL + (totalWidth - blockW) / 2;
      } else {
        xStart = marginL;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(labelSize);
      doc.setTextColor(labR, labG, labB);
      const labelText = ps.signatoryLabelUppercase ? sig.label.toUpperCase() : sig.label;
      y += lineH;
      doc.text(labelText, xStart, y, { align: "left" });

      const colW = personColW + peopleGap;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(nameSize);
      doc.setTextColor(nmR, nmG, nmB);
      y += lineH + labelToNameGap;
      people.forEach((p, pi) => {
        if (p.name) doc.text(p.name, xStart + colW * pi, y, { align: "left" });
      });
      const hasPos = people.some((p) => p.position?.trim());
      if (hasPos) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(posSize);
        doc.setTextColor(poR, poG, poB);
        y += lineH;
        people.forEach((p, pi) => {
          if (p.position?.trim()) doc.text(p.position, xStart + colW * pi, y, { align: "left" });
        });
      }
      if (idx < sigs.length - 1) y += blockGap;
    });
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0);
    return;
  }

  
  const sigs = normalizeSignatories(rawSigs);

  
  const rowsMap = new Map<number, typeof sigs>();
  sigs.forEach((s) => {
    const r = s.row ?? 0;
    if (!rowsMap.has(r)) rowsMap.set(r, []);
    rowsMap.get(r)!.push(s);
  });
  const rowKeys = Array.from(rowsMap.keys()).sort((a, b) => a - b);

  const labelSize = ps.signatoryLabelFontSize ?? 9;
  const nameSize = ps.signatoryNameFontSize ?? 10;
  const posSize = ps.signatoryPositionFontSize ?? 8;

  let y = pageHeight - getEffectiveSignatoryBottomMm(ps) + SIGNATORY_TOP_PAD_MM;
  if (rowKeys.length > 1) y -= (rowKeys.length - 1) * rowGap;

  
  
  const textAlign: HAlign =
    align === "left" ? "left" : align === "right" ? "right" : "center";

  rowKeys.forEach((rk, rowIdx) => {
    const rowSigs = rowsMap.get(rk)!;
    
    
    const anchors: number[] = [];
    if (align === "justify") {
      const colWidth = totalWidth / rowSigs.length;
      rowSigs.forEach((_, i) => anchors.push(marginL + colWidth * i + colWidth / 2));
    } else if (align === "left") {
      rowSigs.forEach((_, i) => anchors.push(marginL + i * (sigBlockWidth + sigGap)));
    } else if (align === "right") {
      const startRight = pageWidth - marginR;
      rowSigs.forEach((_, i) =>
        anchors.push(startRight - (rowSigs.length - 1 - i) * (sigBlockWidth + sigGap))
      );
    } else {
      const totalRow = rowSigs.length * sigBlockWidth + (rowSigs.length - 1) * sigGap;
      const start = (pageWidth - totalRow) / 2;
      rowSigs.forEach((_, i) => anchors.push(start + sigBlockWidth / 2 + i * (sigBlockWidth + sigGap)));
    }

    const ry = y + rowIdx * rowGap;
    rowSigs.forEach((sig, i) => {
      const ax = anchors[i];
      doc.setFont("helvetica", "bold");
      doc.setFontSize(labelSize);
      doc.setTextColor(labR, labG, labB);
      const labelText = ps.signatoryLabelUppercase ? sig.label.toUpperCase() : sig.label;
      if (labelText) doc.text(labelText, ax, ry, { align: textAlign });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(nameSize);
      doc.setTextColor(nmR, nmG, nmB);
      if (sig.name) doc.text(sig.name, ax, ry + lineOffset, { align: textAlign });

      if (sig.position?.trim()) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(posSize);
        doc.setTextColor(poR, poG, poB);
        doc.text(sig.position, ax, ry + lineOffset + 4, { align: textAlign });
      }
    });
  });

  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0);
}
