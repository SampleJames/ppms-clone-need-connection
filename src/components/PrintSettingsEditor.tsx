import { useRef } from "react";
import { Upload, X, Plus, Trash2, Bold, Italic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PrintSettings, Signatory, SignatoryPerson, DEFAULT_PRINT_SETTINGS, Project, OrgLineStyle, ExtraLogo, SecondaryHeader } from "@/types";
import { fileToDataUrl, getSignatoryPeople } from "@/lib/printSettings";
import { toast } from "@/hooks/use-toast";
import PrintLayoutPreview from "@/components/PrintLayoutPreview";

interface Props {
  value: PrintSettings;
  onChange: (next: PrintSettings) => void;
    embedded?: boolean;
    project?: Project | null;
    orientation?: "portrait" | "landscape";
    format?: "a4" | "legal";
    previewTitle?: string;
}

export default function PrintSettingsEditor({
  value,
  onChange,
  embedded,
  project,
  orientation,
  format,
  previewTitle,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInput2Ref = useRef<HTMLInputElement>(null);
  const extraInputRef = useRef<HTMLInputElement>(null);
  const pendingExtraIdx = useRef<number | null>(null);

  const update = (patch: Partial<PrintSettings>) => onChange({ ...value, ...patch });

  const handleLogoUploadFor = (slot: 1 | 2) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 1024 * 1024) {
      toast({ title: "Image too large", description: "Please use an image under 1MB.", variant: "destructive" });
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    if (slot === 1) {
      update({ logoDataUrl: dataUrl });
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else {
      update({ logo2DataUrl: dataUrl });
      if (fileInput2Ref.current) fileInput2Ref.current.value = "";
    }
  };

  const handleExtraLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const idx = pendingExtraIdx.current;
    pendingExtraIdx.current = null;
    if (!file || idx == null) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 1024 * 1024) {
      toast({ title: "Image too large", description: "Please use an image under 1MB.", variant: "destructive" });
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    const next = [...(value.extraLogos || [])];
    next[idx] = { ...next[idx], dataUrl };
    update({ extraLogos: next });
    if (extraInputRef.current) extraInputRef.current.value = "";
  };

  const addExtraLogo = () => {
    const next: ExtraLogo[] = [
      ...(value.extraLogos || []),
      { dataUrl: "", widthMm: 22, layout: { xMm: 0, yMm: 10, align: "center" } },
    ];
    update({ extraLogos: next });
  };
  const removeExtraLogo = (idx: number) => {
    const next = [...(value.extraLogos || [])].filter((_, i) => i !== idx);
    update({ extraLogos: next });
  };
  const updateExtraLogo = (idx: number, patch: Partial<ExtraLogo>) => {
    const next = [...(value.extraLogos || [])];
    next[idx] = { ...next[idx], ...patch };
    update({ extraLogos: next });
  };

  const updateOrgLine = (idx: number, v: string) => {
    const next = [...value.orgLines];
    next[idx] = v;
    update({ orgLines: next });
  };
  const addOrgLine = () => update({ orgLines: [...value.orgLines, ""] });
  const removeOrgLine = (idx: number) => {
    const styles = (value.orgLineStyles || []).filter((_, i) => i !== idx);
    update({ orgLines: value.orgLines.filter((_, i) => i !== idx), orgLineStyles: styles });
  };
  const updateOrgLineStyle = (idx: number, patch: Partial<OrgLineStyle>) => {
    const styles = [...(value.orgLineStyles || [])];
    styles[idx] = { ...styles[idx], ...patch };
    update({ orgLineStyles: styles });
  };

  const updateSig = (idx: number, patch: Partial<Signatory>) => {
    const next = [...value.signatories];
    next[idx] = { ...next[idx], ...patch };
    update({ signatories: next });
  };
  const addSig = () => {
    const nextRow = value.signatories.length
      ? Math.max(...value.signatories.map((s) => s.row ?? 0)) + 1
      : 0;
    update({ signatories: [...value.signatories, { label: "Noted by", name: "", position: "", people: [{ name: "", position: "" }], row: nextRow }] });
  };
  const removeSig = (idx: number) => update({ signatories: value.signatories.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-4">
      <Section embedded={embedded} title="Layout preview" description="Adjust positions in the panel on the right. Changes apply to every PDF export.">
        <PrintLayoutPreview
          value={value}
          onChange={onChange}
          project={project}
          orientation={orientation}
          format={format}
          title={previewTitle}
        />
      </Section>
      <Section embedded={embedded} title="Header logos" description="Upload logos here. Position and size them in the preview's Logos tab.">
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleLogoUploadFor(1)} />
        <input ref={fileInput2Ref} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleLogoUploadFor(2)} />
        <input ref={extraInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleExtraLogoUpload} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {([1, 2] as const).map((slot) => {
            const dataUrl =
              slot === 1 ? value.logoDataUrl : value.logo2DataUrl || "";
            const setRef = slot === 1 ? fileInputRef : fileInput2Ref;
            const onClear = () =>
              slot === 1 ? update({ logoDataUrl: "" }) : update({ logo2DataUrl: "" });
            return (
              <button
                key={slot}
                type="button"
                onClick={() => setRef.current?.click()}
                className="group relative flex flex-col items-center gap-1 rounded-md border bg-background p-2 text-center hover:border-primary hover:bg-muted/40"
              >
                {dataUrl ? (
                  <>
                    <img src={dataUrl} alt={`Logo ${slot}`} className="h-12 w-12 rounded border bg-muted object-contain p-0.5" />
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); onClear(); }}
                      className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                      title="Remove"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </>
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded border border-dashed bg-muted/30">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <span className="text-[11px] font-medium text-muted-foreground">
                  Logo {slot}{!dataUrl && " — upload"}
                </span>
              </button>
            );
          })}
          {(value.extraLogos || []).map((lg, idx) => (
            <button
              key={`extra-${idx}`}
              type="button"
              onClick={() => { pendingExtraIdx.current = idx; extraInputRef.current?.click(); }}
              className="group relative flex flex-col items-center gap-1 rounded-md border bg-background p-2 text-center hover:border-primary hover:bg-muted/40"
            >
              {lg.dataUrl ? (
                <img src={lg.dataUrl} alt={`Extra ${idx + 1}`} className="h-12 w-12 rounded border bg-muted object-contain p-0.5" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded border border-dashed bg-muted/30">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <span className="text-[11px] font-medium text-muted-foreground">Logo {idx + 3}</span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); removeExtraLogo(idx); }}
                className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                title="Remove"
              >
                <X className="h-3 w-3" />
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={addExtraLogo}
            className="flex flex-col items-center justify-center gap-1 rounded-md border border-dashed bg-background p-2 text-[11px] text-muted-foreground hover:border-primary hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
            Add logo
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">Click a tile to upload or replace. Adjust size and position in the preview's Logos tab.</p>
      </Section>

      <Section embedded={embedded} title="Organization & address" description="Lines printed at the top center of every PDF. Toggle bold/italic per line.">
        <div className="space-y-2">
          {value.orgLines.map((line, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={line}
                onChange={(e) => updateOrgLine(i, e.target.value)}
                placeholder={i === 0 ? "Republic of the Philippines" : "Department / Office / Division"}
                className="h-9"
              />
              <StyleToggle
                bold={value.orgLineStyles?.[i]?.bold ?? (i === 0)}
                italic={!!value.orgLineStyles?.[i]?.italic}
                onBold={(b) => updateOrgLineStyle(i, { bold: b })}
                onItalic={(b) => updateOrgLineStyle(i, { italic: b })}
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => removeOrgLine(i)} title="Remove line">
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addOrgLine}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add line
          </Button>
        </div>
      </Section>

      <Section
        embedded={embedded}
        title="Additional headers"
        description="Add extra customizable header blocks below the primary one. Set their text and bold/italic here — alignment, position and font sizes are configured in the Org tab of the layout preview."
      >
        <div className="space-y-3">
          {(value.additionalHeaders || []).map((h, hi) => {
            const updateH = (patch: Partial<SecondaryHeader>) => {
              const next = [...(value.additionalHeaders || [])];
              next[hi] = { ...next[hi], ...patch };
              update({ additionalHeaders: next });
            };
            const removeH = () => {
              const next = (value.additionalHeaders || []).filter((_, i) => i !== hi);
              update({ additionalHeaders: next });
            };
            const addLine = () => updateH({ orgLines: [...h.orgLines, ""] });
            const setLine = (idx: number, v: string) => {
              const lines = [...h.orgLines];
              lines[idx] = v;
              updateH({ orgLines: lines });
            };
            const removeLine = (idx: number) => {
              updateH({
                orgLines: h.orgLines.filter((_, i) => i !== idx),
                orgLineStyles: (h.orgLineStyles || []).filter((_, i) => i !== idx),
              });
            };
            const setLineStyle = (idx: number, patch: Partial<OrgLineStyle>) => {
              const styles = [...(h.orgLineStyles || [])];
              styles[idx] = { ...styles[idx], ...patch };
              updateH({ orgLineStyles: styles });
            };
            return (
              <div key={hi} className="rounded-md border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Header {hi + 2}
                  </div>
                  <button
                    type="button"
                    onClick={removeH}
                    className="text-muted-foreground hover:text-destructive"
                    title="Remove header"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="space-y-2">
                  {h.orgLines.map((line, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={line}
                        onChange={(e) => setLine(i, e.target.value)}
                        placeholder={i === 0 ? "Header line" : "Additional line"}
                        className="h-9"
                      />
                      <StyleToggle
                        bold={h.orgLineStyles?.[i]?.bold ?? (i === 0)}
                        italic={!!h.orgLineStyles?.[i]?.italic}
                        onBold={(b) => setLineStyle(i, { bold: b })}
                        onItalic={(b) => setLineStyle(i, { italic: b })}
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(i)} title="Remove line">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addLine}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add line
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Open the layout preview's <span className="font-medium">Org</span> tab to set this header's alignment, position, line gap, font sizes and color.
                </p>
              </div>
            );
          })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const next: SecondaryHeader[] = [
                ...(value.additionalHeaders || []),
                {
                  enabled: true,
                  orgLines: [""],
                  orgLineStyles: [],
                  addressLine: "",
                  layout: {
                    xMm: 0,
                    yMm: 26 + (value.additionalHeaders?.length || 0) * 10,
                    align: "center",
                  },
                  primaryFontSize: 9,
                  secondaryFontSize: 8,
                  addressFontSize: 8,
                  lineGapMm: 4,
                  color: "#000000",
                },
              ];
              update({ additionalHeaders: next });
            }}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add header
          </Button>
        </div>
      </Section>

      <Section embedded={embedded} title="Project info block" description="Auto-fills project name, location, contractor, and date below the title.">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Show project info on PDFs</Label>
          <Switch
            checked={value.showProjectInfo}
            onCheckedChange={(c) => update({ showProjectInfo: c })}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Per-document overrides — leave blank to fall back to the project values. Each doc type
          (ABC / DUPA / BOQ / S-Curve) can have its own values.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Project name override</Label>
            <Input
              value={value.projectInfoNameOverride ?? ""}
              onChange={(e) => update({ projectInfoNameOverride: e.target.value })}
              placeholder={project?.name || "Use project name"}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Location override</Label>
            <Input
              value={value.projectInfoLocationOverride ?? ""}
              onChange={(e) => update({ projectInfoLocationOverride: e.target.value })}
              placeholder="Use project location"
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Contractor override</Label>
            <Input
              value={value.projectInfoContractorOverride ?? ""}
              onChange={(e) => update({ projectInfoContractorOverride: e.target.value })}
              placeholder="Use project contractor"
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Date override</Label>
            <Input
              value={value.projectInfoDateOverride ?? ""}
              onChange={(e) => update({ projectInfoDateOverride: e.target.value })}
              placeholder="Use today"
              className="h-9"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Default Location</Label>
            <Input
              value={value.defaultLocation}
              onChange={(e) => update({ defaultLocation: e.target.value })}
              placeholder="e.g. Quezon City"
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Default Contractor</Label>
            <Input
              value={value.defaultContractor}
              onChange={(e) => update({ defaultContractor: e.target.value })}
              placeholder="e.g. ABC Construction Inc."
              className="h-9"
            />
          </div>
        </div>
      </Section>

      <Section embedded={embedded} title="Signatories" description="Each entry is one signatory with its own label, name, position, and row. Same row = side-by-side; different rows stack vertically (Detailed layout only).">
        <div className="space-y-3">
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
          {value.signatories.map((s, i) => {
            const isDetailed = value.signatoriesLayout === "detailed";
            if (isDetailed) {
              return (
                <div key={i} className="rounded-md border p-3 space-y-2">
                  <div className="grid grid-cols-[1fr_1fr_1fr_70px_auto] gap-2 items-end">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Label</Label>
                      <Input value={s.label} onChange={(e) => updateSig(i, { label: e.target.value })} placeholder="e.g. Prepared by" className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Name</Label>
                      <Input value={s.name} onChange={(e) => updateSig(i, { name: e.target.value, people: undefined })} placeholder="Full name" className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Position</Label>
                      <Input value={s.position} onChange={(e) => updateSig(i, { position: e.target.value, people: undefined })} placeholder="Position" className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Row</Label>
                      <Input
                        type="number"
                        min={0}
                        max={9}
                        value={s.row ?? 0}
                        onChange={(e) => updateSig(i, { row: Math.max(0, Number(e.target.value) || 0) })}
                        className="h-9"
                        title="Same row = side-by-side; different rows stack vertically."
                      />
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeSig(i)} title="Remove signatory">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            }
            const people: SignatoryPerson[] = getSignatoryPeople(s);
            const setPeople = (arr: SignatoryPerson[]) => {
              const first = arr[0] || { name: "", position: "" };
              updateSig(i, { people: arr, name: first.name, position: first.position });
            };
            const updatePerson = (pi: number, patch: Partial<SignatoryPerson>) => {
              const next = people.map((p, k) => (k === pi ? { ...p, ...patch } : p));
              setPeople(next);
            };
            const addPerson = () => setPeople([...people, { name: "", position: "" }]);
            const removePerson = (pi: number) => setPeople(people.filter((_, k) => k !== pi));
            return (
              <div key={i} className="rounded-md border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Label</Label>
                    <Input value={s.label} onChange={(e) => updateSig(i, { label: e.target.value })} placeholder="e.g. Prepared by" className="h-9" />
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeSig(i)} title="Remove signatory" className="mt-5">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] text-muted-foreground">People (shown side-by-side)</Label>
                  {people.map((p, pi) => (
                    <div key={pi} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                      <Input value={p.name} onChange={(e) => updatePerson(pi, { name: e.target.value })} placeholder={`Name ${pi + 1}`} className="h-9" />
                      <Input value={p.position} onChange={(e) => updatePerson(pi, { position: e.target.value })} placeholder="Position" className="h-9" />
                      {people.length > 1 ? (
                        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removePerson(pi)} title="Remove person">
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      ) : <span />}
                    </div>
                  ))}
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={addPerson}>
                    <Plus className="mr-1 h-3 w-3" /> Add person
                  </Button>
                </div>
              </div>
            );
          })}
          <Button type="button" variant="outline" size="sm" onClick={addSig}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add signatory
          </Button>
        </div>
      </Section>

    </div>
  );
}

function Section({
  title,
  description,
  children,
  embedded,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  embedded?: boolean;
}) {
  if (embedded) {
    return (
      <div className="space-y-3 border-t pt-4 first:border-t-0 first:pt-0">
        <div>
          <h4 className="text-sm font-semibold">{title}</h4>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {children}
      </div>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

function StyleToggle({
  bold,
  italic,
  onBold,
  onItalic,
}: {
  bold: boolean;
  italic: boolean;
  onBold: (v: boolean) => void;
  onItalic: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-md border bg-background p-0.5">
      <button
        type="button"
        onClick={() => onBold(!bold)}
        className={`rounded p-1 transition-colors ${bold ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
        title="Bold"
      >
        <Bold className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onItalic(!italic)}
        className={`rounded p-1 transition-colors ${italic ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
        title="Italic"
      >
        <Italic className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
