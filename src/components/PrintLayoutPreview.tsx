import { useRef, useState, useEffect } from "react";
import { PrintSettings, Project, HAlign, ABCItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { NumberField } from "@/components/ui/number-field";
import {
  Eye,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Image as ImageIcon,
  Building2,
  FileText,
  Users,
  Type,
} from "lucide-react";
import jsPDF from "jspdf";
import { renderPdfHeader, renderPdfSignatories, computeHeaderLayout, getSignatoryPeople } from "@/lib/printSettings";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type Orientation = "portrait" | "landscape";

interface Props {
  value: PrintSettings;
  onChange: (next: PrintSettings) => void;
  project?: Project | null;
  orientation?: Orientation;
  format?: "a4" | "legal";
    readOnly?: boolean;
    title?: string;
    abcItems?: ABCItem[];
    abcHeaderBg?: string;
  abcHeaderText?: string;
  abcCategoryBg?: string;
}

const PAGE_SIZES: Record<string, { w: number; h: number }> = {
  a4: { w: 210, h: 297 },
  legal: { w: 216, h: 356 },
};

export default function PrintLayoutPreview({
  value,
  onChange,
  project,
  orientation = "portrait",
  format = "a4",
  readOnly = false,
  title = "DOCUMENT TITLE",
  abcItems,
  abcHeaderBg = "#FFFFFF",
  abcHeaderText = "#000000",
  abcCategoryBg = "#e8eef5",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(2.2);
  const [activeTab, setActiveTab] = useState<string>("logo");
  const focusTab = (tab: string) => {
    setActiveTab(tab);
    
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-print-tab="${tab}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  const base = PAGE_SIZES[format];
  const pageW = orientation === "portrait" ? base.w : base.h;
  const pageH = orientation === "portrait" ? base.h : base.w;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const cw = el.clientWidth;
      const s = Math.max(1.2, Math.min(3.2, (cw - 16) / pageW));
      setScale(s);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pageW]);

  const pxW = pageW * scale;
  const pxH = pageH * scale;
  const mm = (n: number) => n * scale;
  const ptToPx = (pt: number) => pt * scale * 0.3528; 

  const marginL = value.pageMarginLeftMm ?? 14;
  const marginR = value.pageMarginRightMm ?? 14;

  
  const layout = computeHeaderLayout(value, pageW, title, !!project);

  
  const elemX = (xMm: number, align: HAlign, widthMm = 0) => {
    if (align === "left") return mm(marginL + xMm);
    if (align === "right") return mm(pageW - marginR - xMm - widthMm);
    return mm(pageW / 2 + xMm - widthMm / 2);
  };

  const previewPdf = () => {
    const doc = new jsPDF({ orientation, unit: "mm", format });
    renderPdfHeader(doc, { title, project: project || null, settings: value });
    doc.setFontSize(10);
    doc.text("This is a layout preview. The exact same header & signatories appear on every export.", 14, 80);
    renderPdfSignatories(doc, project || null, value);
    const url = doc.output("bloburl");
    window.open(url, "_blank");
  };

  
  const orgLines = (value.orgLines || []).filter((l) => l.trim());

  
  const orgBlockMm = 100;
  const projInfoBlockMm = pageW - marginL - marginR;

  const renderLogo = (dataUrl: string, widthMm: number, lay: { xMm: number; yMm: number; align: HAlign }) =>
    dataUrl ? (
      <div
        className="absolute cursor-pointer hover:outline hover:outline-1 hover:outline-primary/60"
        onDoubleClick={() => focusTab("logo")}
        title="Double-click to edit logo"
        style={{
          left: elemX(lay.xMm, lay.align, widthMm),
          top: mm(lay.yMm),
          width: mm(widthMm),
          height: mm(widthMm),
        }}
      >
        <img src={dataUrl} alt="Logo" className="h-full w-full object-contain" />
      </div>
    ) : null;

  const Page = (
    <div ref={containerRef} className="rounded-lg border bg-slate-200/70 dark:bg-slate-800/40 p-2">
      <div
        className="relative mx-auto overflow-hidden rounded-sm bg-white shadow-md"
        style={{ width: pxW, height: pxH }}
      >
        {}
        <div
          className="pointer-events-none absolute border border-dashed border-muted-foreground/15"
          style={{ left: mm(marginL), top: mm(10), right: mm(marginR), bottom: mm(10) }}
        />

        {}
        {renderLogo(value.logoDataUrl, value.logoWidthMm, value.logoLayout)}
        {value.logo2DataUrl && value.logo2Layout &&
          renderLogo(value.logo2DataUrl, value.logo2WidthMm ?? 22, value.logo2Layout)}
        {value.logo3DataUrl && value.logo3Layout &&
          renderLogo(value.logo3DataUrl, value.logo3WidthMm ?? 22, value.logo3Layout)}
        {(value.extraLogos || []).map((lg, i) =>
          lg.dataUrl ? (
            <div key={`xl-${i}`}>{renderLogo(lg.dataUrl, lg.widthMm, lg.layout)}</div>
          ) : null
        )}

        {}
        {(orgLines.length > 0 || value.addressLine?.trim()) && (
          <div
            className="absolute cursor-pointer hover:outline hover:outline-1 hover:outline-primary/60"
            onDoubleClick={() => focusTab("org")}
            title="Double-click to edit organization"
            style={{
              left: elemX(value.orgLayout.xMm, value.orgLayout.align, orgBlockMm),
              top: mm(layout.orgFirstBaseline) - ptToPx(value.orgPrimaryFontSize),
              width: mm(orgBlockMm),
              color: value.orgTextColor || undefined,
              textAlign:
                value.orgLayout.align === "left" ? "left" : value.orgLayout.align === "right" ? "right" : "center",
            }}
          >
            {orgLines.map((l, i) => (
              <div
                key={i}
                style={{
                  fontWeight: (value.orgLineStyles?.[i]?.bold ?? (i === 0)) ? 700 : 400,
                  fontStyle: value.orgLineStyles?.[i]?.italic ? "italic" : undefined,
                  fontSize: ptToPx(i === 0 ? value.orgPrimaryFontSize : value.orgSecondaryFontSize),
                  lineHeight: 1,
                  marginBottom: mm(value.orgLineGapMm) - ptToPx(i === 0 ? value.orgPrimaryFontSize : value.orgSecondaryFontSize),
                }}
              >
                {l}
              </div>
            ))}
            {value.addressLine?.trim() && (
              <div
                style={{
                  fontStyle: "italic",
                  fontSize: ptToPx(value.addressFontSize),
                  lineHeight: 1,
                }}
              >
                {value.addressLine}
              </div>
            )}
          </div>
        )}

        {}
        {value.secondaryHeader?.enabled && (() => {
          const sh = value.secondaryHeader!;
          const lines = (sh.orgLines || []).filter((l) => l.trim());
          const blockMm = 100;
          return (
            <div
              className="absolute cursor-pointer hover:outline hover:outline-1 hover:outline-primary/60"
              onDoubleClick={() => focusTab("org")}
              title="Double-click to edit secondary header"
              style={{
                left: elemX(sh.layout.xMm, sh.layout.align, blockMm),
                top: mm(sh.layout.yMm) - ptToPx(sh.primaryFontSize),
                width: mm(blockMm),
                color: sh.color || undefined,
                textAlign: sh.layout.align === "left" ? "left" : sh.layout.align === "right" ? "right" : "center",
              }}
            >
              {lines.map((l, i) => (
                <div
                  key={i}
                  style={{
                    fontWeight: (sh.orgLineStyles?.[i]?.bold ?? (i === 0)) ? 700 : 400,
                    fontStyle: sh.orgLineStyles?.[i]?.italic ? "italic" : undefined,
                    fontSize: ptToPx(i === 0 ? sh.primaryFontSize : sh.secondaryFontSize),
                    lineHeight: 1,
                    marginBottom: mm(sh.lineGapMm) - ptToPx(i === 0 ? sh.primaryFontSize : sh.secondaryFontSize),
                  }}
                >
                  {l}
                </div>
              ))}
              {sh.addressLine?.trim() && (
                <div style={{ fontStyle: "italic", fontSize: ptToPx(sh.addressFontSize), lineHeight: 1 }}>
                  {sh.addressLine}
                </div>
              )}
            </div>
          );
        })()}

        {}
        {(value.additionalHeaders || []).map((h, hi) => {
          if (!h || h.enabled === false) return null;
          const lines = (h.orgLines || []).filter((l) => l.trim());
          if (lines.length === 0 && !h.addressLine?.trim()) return null;
          const blockMm = 100;
          return (
            <div
              key={`ah-${hi}`}
              className="absolute cursor-pointer hover:outline hover:outline-1 hover:outline-primary/60"
              onDoubleClick={() => focusTab("org")}
              title="Double-click to edit additional header"
              style={{
                left: elemX(h.layout.xMm, h.layout.align, blockMm),
                top: mm(h.layout.yMm) - ptToPx(h.primaryFontSize),
                width: mm(blockMm),
                color: h.color || undefined,
                textAlign: h.layout.align === "left" ? "left" : h.layout.align === "right" ? "right" : "center",
              }}
            >
              {lines.map((l, i) => (
                <div
                  key={i}
                  style={{
                    fontWeight: (h.orgLineStyles?.[i]?.bold ?? (i === 0)) ? 700 : 400,
                    fontStyle: h.orgLineStyles?.[i]?.italic ? "italic" : undefined,
                    fontSize: ptToPx(i === 0 ? h.primaryFontSize : h.secondaryFontSize),
                    lineHeight: 1,
                    marginBottom: mm(h.lineGapMm) - ptToPx(i === 0 ? h.primaryFontSize : h.secondaryFontSize),
                  }}
                >
                  {project?.name ? l.replace(/\(Add Project Name\)/gi, project.name) : l}
                </div>
              ))}
            </div>
          );
        })}

        {}
        <div
          className="absolute cursor-pointer hover:outline hover:outline-1 hover:outline-primary/60"
          onDoubleClick={() => focusTab("title")}
          title="Double-click to edit title"
          style={{
            left: 0,
            top: mm(layout.titleBaseline) - ptToPx(value.titleFontSize),
            width: pxW,
            textAlign: "center",
            fontWeight: value.titleBold !== false ? 700 : 400,
            fontStyle: value.titleItalic ? "italic" : undefined,
            color: value.titleColor || undefined,
            fontSize: ptToPx(value.titleFontSize),
            lineHeight: 1,
          }}
        >
          {layout.resolvedTitle}
        </div>

        {}
        {value.showProjectInfo && (() => {
          const showName = value.projectInfoShowName !== false;
          const showLoc = value.projectInfoShowLocation !== false;
          const showCon = value.projectInfoShowContractor !== false;
          const showDate = value.projectInfoShowDate !== false;
          if (!showName && !showLoc && !showCon && !showDate) return null;
          const projName = value.projectInfoNameOverride?.trim() || project?.name || "Sample Project";
          const loc = value.projectInfoLocationOverride?.trim() || project?.location || value.defaultLocation || "";
          const con = value.projectInfoContractorOverride?.trim() || project?.contractor || value.defaultContractor || "";
          const dateStr = value.projectInfoDateOverride?.trim() || new Date().toLocaleDateString();
          if (value.projectInfoIndependentFields) {
            const fieldBlockMm = 80;
            const renderField = (
              text: string,
              lay: { xMm: number; yMm: number; align: HAlign } | undefined,
              fallbackY: number,
              fallbackAlign: HAlign,
              fallbackX: number
            ) => {
              const l = lay ?? { xMm: fallbackX, yMm: fallbackY, align: fallbackAlign };
              return (
                <div
                  className="absolute cursor-pointer hover:outline hover:outline-1 hover:outline-primary/60"
                  onDoubleClick={() => focusTab("title")}
                  title="Double-click to edit project info"
                  style={{
                    left: elemX(l.xMm, l.align, fieldBlockMm),
                    top: mm(l.yMm) - ptToPx(value.projectInfoFontSize),
                    width: mm(fieldBlockMm),
                    color: value.projectInfoColor || undefined,
                    textAlign: l.align === "left" ? "left" : l.align === "right" ? "right" : "center",
                    fontSize: ptToPx(value.projectInfoFontSize),
                    lineHeight: 1.1,
                  }}
                >
                  {text}
                </div>
              );
            };
            return (
              <>
                {showName && renderField(`Project: ${projName}`, value.projectInfoNameLayout, 36, "left", 14)}
                {showLoc && loc && renderField(`Location: ${loc}`, value.projectInfoLocationLayout, 41, "left", 14)}
                {showCon && con && renderField(`Contractor: ${con}`, value.projectInfoContractorLayout, 36, "right", 14)}
                {showDate && renderField(`Date: ${dateStr}`, value.projectInfoDateLayout, 41, "right", 14)}
              </>
            );
          }
          const leftParts: string[] = [];
          if (showName) leftParts.push(`Project: ${projName}`);
          if (showLoc && loc) leftParts.push(`Location: ${loc}`);
          const rightParts: string[] = [];
          if (showCon && con) rightParts.push(`Contractor: ${con}`);
          if (showDate) rightParts.push(`Date: ${dateStr}`);
          return (
            <div
              className="absolute cursor-pointer hover:outline hover:outline-1 hover:outline-primary/60"
              onDoubleClick={() => focusTab("title")}
              title="Double-click to edit project info"
              style={{
                left: elemX(value.projectInfoLayout.xMm, value.projectInfoLayout.align, projInfoBlockMm),
                top: mm(layout.projectInfoBaseline) - ptToPx(value.projectInfoFontSize),
                width: mm(projInfoBlockMm),
                color: value.projectInfoColor || undefined,
                textAlign:
                  value.projectInfoLayout.align === "left"
                    ? "left"
                    : value.projectInfoLayout.align === "right"
                    ? "right"
                    : "center",
                fontSize: ptToPx(value.projectInfoFontSize),
                lineHeight: 1.1,
                display: "flex",
                justifyContent: value.projectInfoLayout.align === "left" ? "space-between" : value.projectInfoLayout.align === "right" ? "flex-end" : "center",
                gap: mm(4),
              }}
            >
              <span>{leftParts.join("   |   ")}</span>
              <span>{rightParts.join("   |   ")}</span>
            </div>
          );
        })()}

        {}
        {value.showHeaderDivider !== false && (
          <div
            className="absolute"
            style={{
              left: mm(marginL),
              right: mm(marginR),
              top: mm(layout.dividerY),
              height: Math.max(1, mm(value.headerDividerThicknessMm ?? 0.2)),
              background: value.headerDividerColor || "hsl(var(--muted-foreground)/0.3)",
            }}
          />
        )}

        {}
        {abcItems && abcItems.length > 0 ? (
          <div
            className="absolute overflow-hidden"
            style={{
              left: mm(marginL),
              right: mm(marginR),
              top: mm(layout.bodyTop),
              bottom: mm(value.signatoriesYFromBottomMm + 4),
              fontSize: Math.max(6, ptToPx(6)),
            }}
          >
            <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
              <thead>
                <tr style={{ background: abcHeaderBg, color: abcHeaderText }}>
                  <th className="text-left" style={{ padding: mm(0.8), width: "12%" }}>Item No.</th>
                  <th className="text-left" style={{ padding: mm(0.8) }}>Description</th>
                  <th className="text-right" style={{ padding: mm(0.8), width: "10%" }}>Qty</th>
                  <th className="text-left" style={{ padding: mm(0.8), width: "10%" }}>Unit</th>
                  <th className="text-right" style={{ padding: mm(0.8), width: "16%" }}>Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {abcItems.slice(0, 14).map((it) => (
                  <tr
                    key={it.id}
                    style={{
                      background: it.isCategory ? abcCategoryBg : "transparent",
                      fontWeight: it.isCategory ? 700 : 400,
                    }}
                  >
                    <td className="border-b border-foreground/10" style={{ padding: mm(0.6) }}>{it.itemNo}</td>
                    <td
                      className="border-b border-foreground/10 truncate"
                      style={{ padding: mm(0.6) }}
                      title={it.description}
                    >
                      {it.description}
                    </td>
                    <td className="border-b border-foreground/10 text-right" style={{ padding: mm(0.6) }}>
                      {it.isCategory ? "" : it.quantity}
                    </td>
                    <td className="border-b border-foreground/10" style={{ padding: mm(0.6) }}>
                      {it.isCategory ? "" : it.unit}
                    </td>
                    <td className="border-b border-foreground/10 text-right" style={{ padding: mm(0.6) }}>
                      {it.isCategory ? "" : (it.totalCost || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
                {abcItems.length > 14 && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted-foreground" style={{ padding: mm(1), fontStyle: "italic" }}>
                      … +{abcItems.length - 14} more rows
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            className="absolute text-muted-foreground/40"
            style={{
              left: mm(marginL),
              right: mm(marginR),
              top: mm(layout.bodyTop),
              fontSize: ptToPx(8),
              fontStyle: "italic",
            }}
          >
            [ document content rendered here — tables, sections, etc. ]
          </div>
        )}

        {}
        {value.signatories.length > 0 && (value.signatoriesLayout ?? "default") === "default" && (() => {
          const sigs = value.signatories;
          const lineHmm = 4.2;
          const blockGap = Math.max(0, 10 + ((value.signatoryRowGapMm ?? 18) - 18));
          const labelToNameGap = Math.max(0, 2 + ((value.signatoryLineOffsetMm ?? 12) - 12));
          const align = value.signatoriesAlign || "left";
          const peopleGapMm = value.signatoryGapMm;
          const personColWmm = value.signatoryBlockWidthMm;
          const innerW = pageW - marginL - marginR;
          const peoplePerSig = sigs.map((s) => getSignatoryPeople(s));
          const blockHeights = peoplePerSig.map((people) => {
            const hasPos = people.some((p) => p.position?.trim());
            return lineHmm + labelToNameGap + lineHmm + (hasPos ? lineHmm : 0);
          });
          const totalH = blockHeights.reduce((a, b) => a + b, 0) + blockGap * Math.max(0, sigs.length - 1);
          const startTop = pageH - value.signatoriesYFromBottomMm - totalH;
          let cursor = startTop;
          const blocks = sigs.map((s, idx) => {
            const top = cursor;
            cursor += blockHeights[idx] + blockGap;
            return { s, top, people: peoplePerSig[idx] };
          });
          return (
            <>
              {blocks.map(({ s, top, people }, i) => {
                const peopleCount = Math.max(1, people.length);
                const blockW = peopleCount * personColWmm + (peopleCount - 1) * peopleGapMm;
                let leftMm: number;
                if (align === "right") leftMm = pageW - marginR - blockW;
                else if (align === "center" || align === "justify") leftMm = marginL + (innerW - blockW) / 2;
                else leftMm = marginL;
                return (
                <div
                  key={i}
                  className="absolute cursor-pointer hover:outline hover:outline-1 hover:outline-primary/60"
                  onDoubleClick={() => focusTab("sigs")}
                  title="Double-click to edit signatories"
                  style={{
                    left: mm(leftMm),
                    top: mm(top),
                    width: mm(blockW),
                    textAlign: "left",
                    lineHeight: 1.2,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      color: value.signatoryLabelColor || "rgb(80,80,80)",
                      fontSize: ptToPx(value.signatoryLabelFontSize),
                      textTransform: value.signatoryLabelUppercase ? "uppercase" : undefined,
                      marginBottom: mm(labelToNameGap),
                    }}
                  >
                    {s.label}
                  </div>
                  <div style={{ display: "flex", gap: mm(peopleGapMm) }}>
                    {people.map((p, pi) => (
                      <div key={pi} style={{ width: mm(personColWmm) }}>
                        <div
                          style={{
                            fontWeight: 700,
                            color: value.signatoryNameColor || undefined,
                            fontSize: ptToPx(value.signatoryNameFontSize),
                          }}
                        >
                          {p.name || "—"}
                        </div>
                        {p.position?.trim() && (
                          <div
                            style={{
                              color: value.signatoryPositionColor || "rgb(80,80,80)",
                              fontSize: ptToPx(value.signatoryPositionFontSize),
                            }}
                          >
                            {p.position}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                );
              })}
            </>
          );
        })()}

        {}
        {value.signatories.length > 0 && value.signatoriesLayout === "detailed" && (() => {
          const align = value.signatoriesAlign;
          const blockW = value.signatoryBlockWidthMm;
          const gap = value.signatoryGapMm;
          const rowGap = value.signatoryRowGapMm ?? 18;
          const innerW = pageW - marginL - marginR;

          const rowsMap = new Map<number, typeof value.signatories>();
          value.signatories.forEach((s) => {
            const r = s.row ?? 0;
            if (!rowsMap.has(r)) rowsMap.set(r, []);
            rowsMap.get(r)!.push(s);
          });
          const rowKeys = Array.from(rowsMap.keys()).sort((a, b) => a - b);

          const baseTop = pageH - value.signatoriesYFromBottomMm - 2;
          const firstRowTop = baseTop - (rowKeys.length - 1) * rowGap;

          return (
            <>
              {rowKeys.map((rk, rowIdx) => {
                const rowSigs = rowsMap.get(rk)!;
                const sigsCountRow = rowSigs.length;
                let leftMm: number;
                let widthMm: number;
                let justifyContent: React.CSSProperties["justifyContent"] = "space-between";

                if (align === "justify") {
                  leftMm = marginL;
                  widthMm = innerW;
                  justifyContent = "space-between";
                } else if (align === "left") {
                  leftMm = marginL;
                  widthMm = sigsCountRow * blockW + (sigsCountRow - 1) * gap;
                  justifyContent = "flex-start";
                } else if (align === "right") {
                  const total = sigsCountRow * blockW + (sigsCountRow - 1) * gap;
                  leftMm = pageW - marginR - total;
                  widthMm = total;
                  justifyContent = "flex-end";
                } else {
                  const total = sigsCountRow * blockW + (sigsCountRow - 1) * gap;
                  leftMm = (pageW - total) / 2;
                  widthMm = total;
                  justifyContent = "center";
                }

                return (
                  <div
                    key={rk}
                    className="absolute flex items-start cursor-pointer hover:outline hover:outline-1 hover:outline-primary/60"
                    onDoubleClick={() => focusTab("sigs")}
                    title="Double-click to edit signatories"
                    style={{
                      left: mm(leftMm),
                      top: mm(firstRowTop + rowIdx * rowGap),
                      width: mm(widthMm),
                      justifyContent,
                      gap: align === "justify" ? 0 : mm(gap),
                    }}
                  >
                    {rowSigs.map((s, i) => {
                      const blockTextAlign: React.CSSProperties["textAlign"] =
                        align === "left" ? "left" : align === "right" ? "right" : "center";
                      const itemsAlign =
                        align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";
                      return (
                      <div
                        key={i}
                        className="flex flex-col"
                        style={{
                          width: align === "justify" ? `${100 / sigsCountRow}%` : mm(blockW),
                          textAlign: blockTextAlign,
                          alignItems: itemsAlign,
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                            color: value.signatoryLabelColor || "rgb(80,80,80)",
                            fontSize: ptToPx(value.signatoryLabelFontSize),
                            lineHeight: 1.1,
                            textTransform: value.signatoryLabelUppercase ? "uppercase" : undefined,
                          }}
                        >
                          {s.label || "—"}
                        </div>
                        <div
                          style={{
                            fontWeight: 700,
                            color: value.signatoryNameColor || undefined,
                            fontSize: ptToPx(value.signatoryNameFontSize),
                            lineHeight: 1.1,
                            marginTop: mm(value.signatoryLineOffsetMm) - ptToPx(value.signatoryLabelFontSize),
                          }}
                        >
                          {s.name || "—"}
                        </div>
                        {s.position?.trim() && (
                          <div
                            style={{
                              color: value.signatoryPositionColor || "rgb(80,80,80)",
                              fontSize: ptToPx(value.signatoryPositionFontSize),
                              lineHeight: 1.1,
                              marginTop: mm(1),
                            }}
                          >
                            {s.position}
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>
                );
              })}
            </>
          );
        })()}
      </div>
    </div>
  );

  if (readOnly) return Page;

  
  const update = (patch: Partial<PrintSettings>) => onChange({ ...value, ...patch });

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_320px]">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Live preview — double-click any element to edit it.
          </span>
        </div>
        {Page}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-col rounded-lg border bg-card md:sticky md:top-4 md:max-h-[calc(100vh-120px)] md:overflow-hidden"
      >
        <TabsList className="grid w-full shrink-0 grid-cols-6 rounded-b-none">
          <TabsTrigger value="page" title="Page margins">
            <FileText className="h-4 w-4 rotate-180" />
          </TabsTrigger>
          <TabsTrigger value="logo" title="Logos">
            <ImageIcon className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="org" title="Organization">
            <Building2 className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="title" title="Title & project info">
            <FileText className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="sigs" title="Signatories">
            <Users className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="type" title="Typography">
            <Type className="h-4 w-4" />
          </TabsTrigger>
        </TabsList>

        {}
        <TabsContent value="page" className="flex-1 min-h-0 space-y-3 overflow-y-auto overscroll-contain p-3">
          <SectionHeader title="Page margins" description="Outer margins and body offset for this document." />
          <SliderRow
            label="Left margin (mm)"
            value={value.pageMarginLeftMm ?? 14}
            min={4}
            max={40}
            step={0.5}
            onChange={(v) => update({ pageMarginLeftMm: v })}
          />
          <SliderRow
            label="Right margin (mm)"
            value={value.pageMarginRightMm ?? 14}
            min={4}
            max={40}
            step={0.5}
            onChange={(v) => update({ pageMarginRightMm: v })}
          />
          <SliderRow
            label="Body top gap (mm)"
            value={value.contentTopGapMm ?? 4}
            min={0}
            max={20}
            step={0.5}
            onChange={(v) => update({ contentTopGapMm: v })}
          />
          <p className="pt-1 text-[11px] text-muted-foreground">
            Margins control where the divider, body table and signatories anchor horizontally.
          </p>
        </TabsContent>

        {}
        <TabsContent value="logo" className="flex-1 min-h-0 space-y-4 overflow-y-auto overscroll-contain p-3">
          <SectionHeader title="Logos" description="Position and size each header logo independently." />
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Logo 1</Label>
            <AlignRow
              label="Alignment"
              value={value.logoLayout.align}
              onChange={(a) => update({ logoLayout: { ...value.logoLayout, align: a } })}
            />
            <SliderRow
              label="X offset (mm)"
              value={value.logoLayout.xMm}
              min={-(pageW - marginL - marginR - value.logoWidthMm)}
              max={pageW - marginL - marginR - value.logoWidthMm}
              onChange={(v) => update({ logoLayout: { ...value.logoLayout, xMm: v } })}
            />
            <SliderRow
              label="Y position (mm)"
              value={value.logoLayout.yMm}
              min={0}
              max={pageH - value.logoWidthMm - 5}
              onChange={(v) => update({ logoLayout: { ...value.logoLayout, yMm: v } })}
            />
            <SliderRow
              label="Width (mm)"
              value={value.logoWidthMm}
              min={10}
              max={Math.min(120, pageW - marginL - marginR)}
              onChange={(v) => update({ logoWidthMm: v })}
            />
          </div>

          <div className="space-y-2 border-t pt-3">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Logo 2 {value.logo2DataUrl ? "" : "(upload in Header logo card above)"}
            </Label>
            <AlignRow
              label="Alignment"
              value={(value.logo2Layout?.align ?? "right") as HAlign}
              onChange={(a) =>
                update({ logo2Layout: { ...(value.logo2Layout ?? { xMm: 14, yMm: 10, align: "right" }), align: a } })
              }
            />
            <SliderRow
              label="X offset (mm)"
              value={value.logo2Layout?.xMm ?? 14}
              min={-(pageW - marginL - marginR - (value.logo2WidthMm ?? 22))}
              max={pageW - marginL - marginR - (value.logo2WidthMm ?? 22)}
              onChange={(v) =>
                update({ logo2Layout: { ...(value.logo2Layout ?? { xMm: 14, yMm: 10, align: "right" }), xMm: v } })
              }
            />
            <SliderRow
              label="Y position (mm)"
              value={value.logo2Layout?.yMm ?? 10}
              min={0}
              max={pageH - (value.logo2WidthMm ?? 22) - 5}
              onChange={(v) =>
                update({ logo2Layout: { ...(value.logo2Layout ?? { xMm: 14, yMm: 10, align: "right" }), yMm: v } })
              }
            />
            <SliderRow
              label="Width (mm)"
              value={value.logo2WidthMm ?? 22}
              min={10}
              max={Math.min(120, pageW - marginL - marginR)}
              onChange={(v) => update({ logo2WidthMm: v })}
            />
          </div>

          <div className="space-y-2 border-t pt-3">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Logo 3 {value.logo3DataUrl ? "" : "(upload in Header logo card above)"}
            </Label>
            <AlignRow
              label="Alignment"
              value={(value.logo3Layout?.align ?? "center") as HAlign}
              onChange={(a) =>
                update({ logo3Layout: { ...(value.logo3Layout ?? { xMm: 0, yMm: 10, align: "center" }), align: a } })
              }
            />
            <SliderRow
              label="X offset (mm)"
              value={value.logo3Layout?.xMm ?? 0}
              min={-(pageW - marginL - marginR - (value.logo3WidthMm ?? 22))}
              max={pageW - marginL - marginR - (value.logo3WidthMm ?? 22)}
              onChange={(v) =>
                update({ logo3Layout: { ...(value.logo3Layout ?? { xMm: 0, yMm: 10, align: "center" }), xMm: v } })
              }
            />
            <SliderRow
              label="Y position (mm)"
              value={value.logo3Layout?.yMm ?? 10}
              min={0}
              max={pageH - (value.logo3WidthMm ?? 22) - 5}
              onChange={(v) =>
                update({ logo3Layout: { ...(value.logo3Layout ?? { xMm: 0, yMm: 10, align: "center" }), yMm: v } })
              }
            />
            <SliderRow
              label="Width (mm)"
              value={value.logo3WidthMm ?? 22}
              min={10}
              max={Math.min(120, pageW - marginL - marginR)}
              onChange={(v) => update({ logo3WidthMm: v })}
            />
          </div>
        </TabsContent>

        {}
        <TabsContent value="org" className="flex-1 min-h-0 space-y-3 overflow-y-auto overscroll-contain p-3">
          <SectionHeader title="Organization block" description="Alignment, position and spacing of the org / address lines." />
          <AlignRow
            label="Alignment"
            value={value.orgLayout.align}
            onChange={(a) => update({ orgLayout: { ...value.orgLayout, align: a } })}
          />
          <SliderRow
            label="X offset (mm)"
            value={value.orgLayout.xMm}
            min={-(pageW / 2 - 14)}
            max={pageW / 2 - 14}
            onChange={(v) => update({ orgLayout: { ...value.orgLayout, xMm: v } })}
          />
          <SliderRow
            label="Y position (mm)"
            value={value.orgLayout.yMm}
            min={0}
            max={pageH - 30}
            onChange={(v) => update({ orgLayout: { ...value.orgLayout, yMm: v } })}
          />
          <SliderRow
            label="Line gap (mm)"
            value={value.orgLineGapMm}
            min={2}
            max={15}
            step={0.5}
            onChange={(v) => update({ orgLineGapMm: v })}
          />
          <ColorRow
            label="Text color"
            value={value.orgTextColor || "#000000"}
            onChange={(v) => update({ orgTextColor: v })}
          />

          {(value.additionalHeaders || []).map((h, hi) => {
            const updateH = (patch: Partial<typeof h>) => {
              const next = [...(value.additionalHeaders || [])];
              next[hi] = { ...next[hi], ...patch };
              update({ additionalHeaders: next });
            };
            return (
              <div key={hi} className="space-y-2 border-t pt-3">
                <AlignRow
                  label={`Header ${hi + 2} alignment`}
                  value={h.layout.align}
                  onChange={(a) => updateH({ layout: { ...h.layout, align: a } })}
                />
                <SliderRow
                  label={`Header ${hi + 2} X offset (mm)`}
                  value={h.layout.xMm}
                  min={-(pageW / 2 - 14)}
                  max={pageW / 2 - 14}
                  onChange={(v) => updateH({ layout: { ...h.layout, xMm: v } })}
                />
                <SliderRow
                  label={`Header ${hi + 2} Y position (mm)`}
                  value={h.layout.yMm}
                  min={0}
                  max={pageH - 30}
                  onChange={(v) => updateH({ layout: { ...h.layout, yMm: v } })}
                />
                <SliderRow
                  label={`Header ${hi + 2} line gap (mm)`}
                  value={h.lineGapMm ?? 4}
                  min={2}
                  max={15}
                  step={0.5}
                  onChange={(v) => updateH({ lineGapMm: v })}
                />
                <ColorRow
                  label={`Header ${hi + 2} text color`}
                  value={h.color || "#000000"}
                  onChange={(v) => updateH({ color: v })}
                />
              </div>
            );
          })}
        </TabsContent>

        {}
        <TabsContent value="title" className="flex-1 min-h-0 space-y-3 overflow-y-auto overscroll-contain p-3">
          <SectionHeader title="Title & project info" description="Document title styling plus the project info block layout." />
          <div className="space-y-1">
            <Label className="text-xs">Title text override</Label>
            <input
              type="text"
              value={value.titleOverride ?? ""}
              onChange={(e) => update({ titleOverride: e.target.value })}
              placeholder={title}
              className="h-8 w-full rounded-md border bg-background px-2 text-xs"
            />
          </div>
          <SliderRow
            label="Title gap above/below (mm)"
            value={value.titleGapMm}
            min={1}
            max={40}
            step={0.5}
            onChange={(v) => update({ titleGapMm: v })}
          />
          <ColorRow
            label="Title color"
            value={value.titleColor || "#000000"}
            onChange={(v) => update({ titleColor: v })}
          />
          <div className="flex flex-wrap gap-3">
            <ToggleChip
              label="Bold"
              active={value.titleBold !== false}
              onChange={(b) => update({ titleBold: b })}
            />
            <ToggleChip
              label="Italic"
              active={!!value.titleItalic}
              onChange={(b) => update({ titleItalic: b })}
            />
            <ToggleChip
              label="UPPERCASE"
              active={!!value.titleUppercase}
              onChange={(b) => update({ titleUppercase: b })}
            />
          </div>
          <div className="flex items-center justify-between gap-2 pt-2">
            <Label className="text-xs">Show header divider</Label>
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={value.showHeaderDivider !== false}
              onChange={(e) => update({ showHeaderDivider: e.target.checked })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ColorRow
              label="Divider color"
              value={value.headerDividerColor || "#b4b4b4"}
              onChange={(v) => update({ headerDividerColor: v })}
            />
            <SliderRow
              label="Divider thickness (mm)"
              value={value.headerDividerThicknessMm ?? 0.2}
              min={0.1}
              max={2}
              step={0.05}
              onChange={(v) => update({ headerDividerThicknessMm: v })}
            />
          </div>
          <div className="space-y-2 border-t pt-2">
            <Label className="text-xs font-semibold">Project info block</Label>
            <div className="flex items-center justify-between gap-2">
              <Label className="text-[11px] text-muted-foreground">Independent fields</Label>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={!!value.projectInfoIndependentFields}
                onChange={(e) => update({ projectInfoIndependentFields: e.target.checked })}
                title="Position name / location / contractor / date independently"
              />
            </div>
            {!value.projectInfoIndependentFields && (
              <>
            <AlignRow
              label="Alignment"
              value={value.projectInfoLayout.align}
              onChange={(a) => update({ projectInfoLayout: { ...value.projectInfoLayout, align: a } })}
            />
            <SliderRow
              label="X offset (mm)"
              value={value.projectInfoLayout.xMm}
              min={-(pageW / 2 - marginL)}
              max={pageW / 2 - marginR}
              onChange={(v) => update({ projectInfoLayout: { ...value.projectInfoLayout, xMm: v } })}
            />
            <SliderRow
              label="Y position (mm)"
              value={value.projectInfoLayout.yMm}
              min={0}
              max={pageH - 30}
              onChange={(v) => update({ projectInfoLayout: { ...value.projectInfoLayout, yMm: v } })}
            />
              </>
            )}
            {value.projectInfoIndependentFields && (
              <div className="space-y-3">
                {([
                  { key: "projectInfoNameLayout", label: "Project name", show: value.projectInfoShowName !== false, fb: { xMm: 14, yMm: 36, align: "left" as HAlign } },
                  { key: "projectInfoLocationLayout", label: "Location", show: value.projectInfoShowLocation !== false, fb: { xMm: 14, yMm: 41, align: "left" as HAlign } },
                  { key: "projectInfoContractorLayout", label: "Contractor", show: value.projectInfoShowContractor !== false, fb: { xMm: 14, yMm: 36, align: "right" as HAlign } },
                  { key: "projectInfoDateLayout", label: "Date", show: value.projectInfoShowDate !== false, fb: { xMm: 14, yMm: 41, align: "right" as HAlign } },
                ] as const).map((f) => {
                  if (!f.show) return null;
                  const lay = (value as any)[f.key] ?? f.fb;
                  const setLay = (patch: Partial<typeof lay>) =>
                    update({ [f.key]: { ...lay, ...patch } } as any);
                  return (
                    <div key={f.key} className="rounded-md border p-2 space-y-1">
                      <Label className="text-[11px] font-semibold">{f.label}</Label>
                      <AlignRow label="Align" value={lay.align} onChange={(a) => setLay({ align: a })} />
                      <SliderRow
                        label="X offset (mm)"
                        value={lay.xMm}
                        min={-(pageW / 2 - marginL)}
                        max={pageW / 2 - marginR}
                        onChange={(v) => setLay({ xMm: v })}
                      />
                      <SliderRow
                        label="Y position (mm)"
                        value={lay.yMm}
                        min={0}
                        max={pageH - 20}
                        onChange={(v) => setLay({ yMm: v })}
                      />
                    </div>
                  );
                })}
              </div>
            )}
            <ColorRow
              label="Text color"
              value={value.projectInfoColor || "#000000"}
              onChange={(v) => update({ projectInfoColor: v })}
            />
            <div className="grid grid-cols-2 gap-1 pt-1">
              <ToggleChip label="Project name" active={value.projectInfoShowName !== false} onChange={(b) => update({ projectInfoShowName: b })} />
              <ToggleChip label="Location" active={value.projectInfoShowLocation !== false} onChange={(b) => update({ projectInfoShowLocation: b })} />
              <ToggleChip label="Contractor" active={value.projectInfoShowContractor !== false} onChange={(b) => update({ projectInfoShowContractor: b })} />
              <ToggleChip label="Date" active={value.projectInfoShowDate !== false} onChange={(b) => update({ projectInfoShowDate: b })} />
            </div>
          </div>
        </TabsContent>

        {}
        <TabsContent value="sigs" className="flex-1 min-h-0 space-y-3 overflow-y-auto overscroll-contain p-3">
          <SectionHeader title="Signatories" description="Footer signature blocks shown on the last page." />
          <div className="space-y-1">
            <Label className="text-xs">Layout</Label>
            <div className="flex gap-1 rounded-md border bg-background p-0.5">
              <button
                type="button"
                onClick={() => update({ signatoriesLayout: "default" })}
                className={`flex-1 rounded px-2 py-1 text-xs ${(value.signatoriesLayout ?? "default") === "default" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                Default
              </button>
              <button
                type="button"
                onClick={() => update({ signatoriesLayout: "detailed" })}
                className={`flex-1 rounded px-2 py-1 text-xs ${value.signatoriesLayout === "detailed" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                Detailed
              </button>
            </div>
          </div>
          <AlignRow
            label="Alignment"
            value={value.signatoriesAlign}
            onChange={(a) => update({ signatoriesAlign: a })}
            includeJustify
          />
          <SliderRow
            label="Distance from bottom (mm)"
            value={value.signatoriesYFromBottomMm}
            min={5}
            max={Math.min(220, pageH - 30)}
            onChange={(v) => update({ signatoriesYFromBottomMm: v })}
          />
          <SliderRow
            label="Block width (mm)"
            value={value.signatoryBlockWidthMm}
            min={30}
            max={Math.min(200, pageW - 28)}
            onChange={(v) => update({ signatoryBlockWidthMm: v })}
          />
          <SliderRow
            label="Gap between blocks (mm)"
            value={value.signatoryGapMm}
            min={0}
            max={60}
            step={0.5}
            onChange={(v) => update({ signatoryGapMm: v })}
          />
          <SliderRow
            label="Row gap (mm)"
            value={value.signatoryRowGapMm ?? 18}
            min={10}
            max={60}
            step={0.5}
            onChange={(v) => update({ signatoryRowGapMm: v })}
          />
          <SliderRow
            label="Signature line offset (mm)"
            value={value.signatoryLineOffsetMm}
            min={6}
            max={40}
            step={0.5}
            onChange={(v) => update({ signatoryLineOffsetMm: v })}
          />
          <div className="grid grid-cols-2 gap-2 border-t pt-2">
            <ColorRow
              label="Line color"
              value={value.signatoryLineColor || "#787878"}
              onChange={(v) => update({ signatoryLineColor: v })}
            />
            <SliderRow
              label="Line thickness (mm)"
              value={value.signatoryLineThicknessMm ?? 0.3}
              min={0.1}
              max={2}
              step={0.05}
              onChange={(v) => update({ signatoryLineThicknessMm: v })}
            />
            <ColorRow
              label="Label color"
              value={value.signatoryLabelColor || "#505050"}
              onChange={(v) => update({ signatoryLabelColor: v })}
            />
            <ColorRow
              label="Name color"
              value={value.signatoryNameColor || "#000000"}
              onChange={(v) => update({ signatoryNameColor: v })}
            />
            <ColorRow
              label="Position color"
              value={value.signatoryPositionColor || "#505050"}
              onChange={(v) => update({ signatoryPositionColor: v })}
            />
            <ToggleChip
              label="Label UPPERCASE"
              active={!!value.signatoryLabelUppercase}
              onChange={(b) => update({ signatoryLabelUppercase: b })}
            />
          </div>
          <p className="pt-2 text-[11px] text-muted-foreground">
            Tip: assign each signatory a <strong>row</strong> in the Signatories editor
            (e.g. row 0 for "Prepared / Checked by", row 1 for "Approved by") to stack them vertically.
          </p>
        </TabsContent>

        {}
        <TabsContent value="type" className="flex-1 min-h-0 space-y-3 overflow-y-auto overscroll-contain p-3">
          <SectionHeader title="Typography" description="Font sizes for headings, body labels and signatories." />
          <SliderRow
            label="Org primary (pt)"
            value={value.orgPrimaryFontSize}
            min={6}
            max={20}
            step={0.5}
            onChange={(v) => update({ orgPrimaryFontSize: v })}
          />
          <SliderRow
            label="Org secondary (pt)"
            value={value.orgSecondaryFontSize}
            min={6}
            max={18}
            step={0.5}
            onChange={(v) => update({ orgSecondaryFontSize: v })}
          />
          <SliderRow
            label="Address (pt)"
            value={value.addressFontSize}
            min={5}
            max={14}
            step={0.5}
            onChange={(v) => update({ addressFontSize: v })}
          />
          <SliderRow
            label="Title (pt)"
            value={value.titleFontSize}
            min={8}
            max={26}
            step={0.5}
            onChange={(v) => update({ titleFontSize: v })}
          />
          <SliderRow
            label="Project info (pt)"
            value={value.projectInfoFontSize}
            min={6}
            max={14}
            step={0.5}
            onChange={(v) => update({ projectInfoFontSize: v })}
          />
          {(value.additionalHeaders || []).map((h, hi) => {
            const updateH = (patch: Partial<typeof h>) => {
              const next = [...(value.additionalHeaders || [])];
              next[hi] = { ...next[hi], ...patch };
              update({ additionalHeaders: next });
            };
            return (
              <div key={hi} className="space-y-1">
                <SliderRow
                  label={`Header ${hi + 2} primary (pt)`}
                  value={h.primaryFontSize ?? 9}
                  min={6}
                  max={20}
                  step={0.5}
                  onChange={(v) => updateH({ primaryFontSize: v })}
                />
                <SliderRow
                  label={`Header ${hi + 2} secondary (pt)`}
                  value={h.secondaryFontSize ?? 8}
                  min={6}
                  max={18}
                  step={0.5}
                  onChange={(v) => updateH({ secondaryFontSize: v })}
                />
              </div>
            );
          })}
          <div className="border-t pt-2">
            <SliderRow
              label="Sig. label (pt)"
              value={value.signatoryLabelFontSize}
              min={6}
              max={14}
              step={0.5}
              onChange={(v) => update({ signatoryLabelFontSize: v })}
            />
            <SliderRow
              label="Sig. name (pt)"
              value={value.signatoryNameFontSize}
              min={6}
              max={16}
              step={0.5}
              onChange={(v) => update({ signatoryNameFontSize: v })}
            />
            <SliderRow
              label="Sig. position (pt)"
              value={value.signatoryPositionFontSize}
              min={5}
              max={12}
              step={0.5}
              onChange={(v) => update({ signatoryPositionFontSize: v })}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  
  
  const safeMin = Number.isFinite(value) ? Math.min(min, value) : min;
  const safeMax = Number.isFinite(value) ? Math.max(max, value) : max;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-[11px] text-muted-foreground">{label}</Label>
        <NumberField
          value={value}
          onValueChange={onChange}
          fallback={safeMin}
          allowNegative={safeMin < 0}
          className="h-7 w-16 text-xs"
        />
      </div>
      <Slider
        value={[value]}
        min={safeMin}
        max={safeMax}
        step={step}
        onValueChange={([v]) => onChange(v)}
        className="py-1"
      />
    </div>
  );
}

function AlignRow<T extends string>({
  label,
  value,
  onChange,
  includeJustify,
}: {
  label: string;
  value: T;
  onChange: (a: any) => void;
  includeJustify?: boolean;
}) {
  const items: { v: string; Icon: any; title: string }[] = [
    { v: "left", Icon: AlignLeft, title: "Left" },
    { v: "center", Icon: AlignCenter, title: "Center" },
    { v: "right", Icon: AlignRight, title: "Right" },
  ];
  if (includeJustify) items.unshift({ v: "justify", Icon: AlignJustify, title: "Justify" });

  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-1 rounded-md border bg-background p-0.5">
        {items.map(({ v, Icon, title }) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`rounded p-1 transition-colors ${
              value === v ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
            title={title}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-1">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-8 cursor-pointer rounded border border-input bg-transparent p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-20 rounded border bg-background px-1 text-[11px] font-mono"
        />
      </div>
    </div>
  );
}

function ToggleChip({ label, active, onChange }: { label: string; active: boolean; onChange: (b: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!active)}
      className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${
        active ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="-mx-3 -mt-3 mb-2 border-b bg-muted/40 px-3 py-2">
      <h5 className="text-xs font-semibold uppercase tracking-wide text-foreground">{title}</h5>
      {description && <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>}
    </div>
  );
}
