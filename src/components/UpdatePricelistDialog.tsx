import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, ArrowRight, RefreshCw, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NumberField } from "@/components/ui/number-field";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { DUPATemplate, MaterialItem, LaborItem, EquipmentItem, PriceListItem, PriceListYear } from "@/types";
import { loadPriceList } from "@/components/PriceList";
import { saveTemplate } from "@/lib/templates";
import { composeSpec } from "@/components/ui/spec-badge";
import { formatCurrency } from "@/lib/calculations";
import { toast } from "@/hooks/use-toast";

type Section = "material" | "labor" | "equipment";
type UnmatchedAction = "keep" | "zero" | "custom";
type MatchTier = "exact" | "descUnit" | "desc";

interface UnmatchedRow {
  templateId: string;
  templateName: string;
  section: Section;
  index: number;
  description: string;
  specification?: string;
  unit?: string;
  currentPrice: number;
  action: UnmatchedAction;
  customPrice: number;
}

interface MatchedPreview {
  templateId: string;
  templateName: string;
  section: Section;
  index: number;
  description: string;
  oldPrice: number;
  newPrice: number;
  tier: MatchTier;
}

interface Props {
    templates: DUPATemplate[] | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
    defaultYearId?: string;
}

const norm = (s: string | undefined) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

interface PriceIndex {
  full: Map<string, PriceListItem>;     // desc|spec|unit
  descUnit: Map<string, PriceListItem>; // desc|unit
  desc: Map<string, PriceListItem>;     // desc
}

function buildPriceIndex(year: PriceListYear): PriceIndex {
  const full = new Map<string, PriceListItem>();
  const descUnit = new Map<string, PriceListItem>();
  const desc = new Map<string, PriceListItem>();
  for (const it of year.items) {
    const spec = composeSpec(it.extraDesc1, it.extraDesc2);
    const d = norm(it.description);
    if (!d) continue;
    full.set(`${d}|${norm(spec)}|${norm(it.unit)}`, it);
    if (!descUnit.has(`${d}|${norm(it.unit)}`)) descUnit.set(`${d}|${norm(it.unit)}`, it);
    if (!desc.has(d)) desc.set(d, it);
  }
  return { full, descUnit, desc };
}

function priceOf(it: PriceListItem) {
  return (it.marketPrice || 0) * (it.markupPrice || 0);
}

/** Tiered match. Strictest first, then loosen progressively. */
function findMatch(
  idx: PriceIndex,
  description: string,
  specification: string | undefined,
  unit: string | undefined,
): { item: PriceListItem; tier: MatchTier } | null {
  const d = norm(description);
  if (!d) return null;
  const s = norm(specification);
  const u = norm(unit);

  // Tier 1: strict desc+spec+unit
  const t1 = idx.full.get(`${d}|${s}|${u}`);
  if (t1) return { item: t1, tier: "exact" };

  
  if (u) {
    const t2 = idx.descUnit.get(`${d}|${u}`);
    if (t2) return { item: t2, tier: "descUnit" };
  }

  
  
  const t3 = idx.desc.get(d);
  if (t3) return { item: t3, tier: "desc" };

  return null;
}

export default function UpdatePricelistDialog({ templates, open, onOpenChange, onUpdated, defaultYearId }: Props) {
  const years = useMemo(() => loadPriceList(), [open]);
  const [yearId, setYearId] = useState<string>("");
  const [doMaterials, setDoMaterials] = useState(true);
  const [doLabor, setDoLabor] = useState(true);
  const [doEquipment, setDoEquipment] = useState(true);
  const [step, setStep] = useState<"config" | "review">("config");
  const [matched, setMatched] = useState<MatchedPreview[]>([]);
  const [unmatched, setUnmatched] = useState<UnmatchedRow[]>([]);
  const baselineRef = useRef<string>("");
  const [confirmClose, setConfirmClose] = useState(false);

  const isDirty = step === "review" && JSON.stringify(unmatched) !== baselineRef.current;

  const requestClose = () => {
    if (isDirty) setConfirmClose(true);
    else onOpenChange(false);
  };
  const handleOpenChange = (o: boolean) => {
    if (!o && isDirty) { setConfirmClose(true); return; }
    onOpenChange(o);
  };

  
  useEffect(() => {
    if (open) {
      setStep("config");
      setMatched([]);
      setUnmatched([]);
      const preferred = defaultYearId && years.find((y) => y.id === defaultYearId)
        ? defaultYearId
        : (years.length > 0 ? years[years.length - 1].id : "");
      setYearId(preferred);
      setDoMaterials(true);
      setDoLabor(true);
      setDoEquipment(true);
    }
  }, [open, years]);

  if (!templates || templates.length === 0) return null;
  const isBulk = templates.length > 1;

  const handlePreview = () => {
    const year = years.find((y) => y.id === yearId);
    if (!year) {
      toast({ title: "Choose a pricelist year", variant: "destructive" });
      return;
    }
    const idx = buildPriceIndex(year);

    const m: MatchedPreview[] = [];
    const u: UnmatchedRow[] = [];

    for (const tpl of templates) {
      if (doMaterials) {
        tpl.materials.forEach((it, i) => {
          if (!it.description.trim()) return;
          const hit = findMatch(idx, it.description, it.specification, it.unit);
          if (hit) m.push({ templateId: tpl.id, templateName: tpl.name, section: "material", index: i, description: it.description, oldPrice: it.unitCost, newPrice: priceOf(hit.item), tier: hit.tier });
          else u.push({ templateId: tpl.id, templateName: tpl.name, section: "material", index: i, description: it.description, specification: it.specification, unit: it.unit, currentPrice: it.unitCost, action: "keep", customPrice: it.unitCost });
        });
      }
      if (doLabor) {
        tpl.labor.forEach((it, i) => {
          if (!it.description.trim()) return;
          const hit = findMatch(idx, it.description, it.specification, undefined);
          if (hit) m.push({ templateId: tpl.id, templateName: tpl.name, section: "labor", index: i, description: it.description, oldPrice: it.wageRate, newPrice: priceOf(hit.item), tier: hit.tier });
          else u.push({ templateId: tpl.id, templateName: tpl.name, section: "labor", index: i, description: it.description, specification: it.specification, currentPrice: it.wageRate, action: "keep", customPrice: it.wageRate });
        });
      }
      if (doEquipment) {
        tpl.equipment.forEach((it, i) => {
          if (!it.description.trim()) return;
          const hit = findMatch(idx, it.description, it.specification, undefined);
          if (hit) m.push({ templateId: tpl.id, templateName: tpl.name, section: "equipment", index: i, description: it.description, oldPrice: it.rate, newPrice: priceOf(hit.item), tier: hit.tier });
          else u.push({ templateId: tpl.id, templateName: tpl.name, section: "equipment", index: i, description: it.description, specification: it.specification, currentPrice: it.rate, action: "keep", customPrice: it.rate });
        });
      }
    }

    if (m.length === 0 && u.length === 0) {
      toast({ title: "Nothing to update", description: "No non-empty items in the selected sections." });
      return;
    }

    setMatched(m);
    setUnmatched(u);
    baselineRef.current = JSON.stringify(u);
    setStep("review");
  };

  const applyUpdate = () => {
    const year = years.find((y) => y.id === yearId);
    if (!year) return;

    
    const byTpl = new Map<string, DUPATemplate>();
    for (const tpl of templates) {
      byTpl.set(tpl.id, {
        ...tpl,
        materials: tpl.materials.map((m) => ({ ...m })),
        labor: tpl.labor.map((l) => ({ ...l })),
        equipment: tpl.equipment.map((e) => ({ ...e })),
      });
    }

    for (const m of matched) {
      const t = byTpl.get(m.templateId); if (!t) continue;
      if (m.section === "material") t.materials[m.index] = { ...t.materials[m.index], unitCost: m.newPrice, unitCostFormula: undefined };
      else if (m.section === "labor") t.labor[m.index] = { ...t.labor[m.index], wageRate: m.newPrice, wageRateFormula: undefined };
      else t.equipment[m.index] = { ...t.equipment[m.index], rate: m.newPrice, rateFormula: undefined };
    }
    for (const u of unmatched) {
      if (u.action === "keep") continue;
      const t = byTpl.get(u.templateId); if (!t) continue;
      const newVal = u.action === "zero" ? 0 : (Number.isFinite(u.customPrice) ? u.customPrice : 0);
      if (u.section === "material") t.materials[u.index] = { ...t.materials[u.index], unitCost: newVal, unitCostFormula: undefined };
      else if (u.section === "labor") t.labor[u.index] = { ...t.labor[u.index], wageRate: newVal, wageRateFormula: undefined };
      else t.equipment[u.index] = { ...t.equipment[u.index], rate: newVal, rateFormula: undefined };
    }

    const now = new Date().toISOString();
    
    const changedIds = new Set<string>();
    matched.forEach((m) => changedIds.add(m.templateId));
    unmatched.filter((u) => u.action !== "keep").forEach((u) => changedIds.add(u.templateId));
    changedIds.forEach((id) => {
      const t = byTpl.get(id);
      if (t) saveTemplate({ ...t, updatedAt: now });
    });

    toast({
      title: "Pricelist applied",
      description: `${matched.length} item(s) updated from ${year.year} across ${changedIds.size} template(s). ${unmatched.length} unmatched.`,
    });
    onUpdated();
    onOpenChange(false);
  };

  const setAllUnmatched = (action: UnmatchedAction) => {
    setUnmatched((arr) => arr.map((u) => ({ ...u, action })));
  };

  const sectionLabel = (s: Section) => s === "material" ? "Material" : s === "labor" ? "Labor" : "Equipment";
  const tierBadge = (t: MatchTier) =>
    t === "exact"
      ? <span className="text-[10px] text-emerald-600">exact</span>
      : t === "descUnit"
        ? <span className="text-[10px] text-blue-600" title="Matched by description + unit (specification was empty)">desc+unit</span>
        : <span className="text-[10px] text-amber-600" title="Loose: matched by description only — verify">desc only</span>;

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[85vh] overflow-y-auto"
        onPointerDownOutside={(e) => { if (isDirty) { e.preventDefault(); setConfirmClose(true); } }}
        onEscapeKeyDown={(e) => { if (isDirty) { e.preventDefault(); setConfirmClose(true); } }}
        onInteractOutside={(e) => { if (isDirty) { e.preventDefault(); setConfirmClose(true); } }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> {isBulk ? "Update Pricelist — All Templates" : "Update Pricelist"}
          </DialogTitle>
          <DialogDescription>
            {isBulk
              ? <>Re-price <span className="font-medium text-foreground">{templates.length} DUPA templates</span> using a chosen pricelist year.</>
              : <>Re-price <span className="font-medium text-foreground">{templates[0].name}</span> using a chosen pricelist year.</>}
            {" "}Matching tries Description + Specification + Unit first, then falls back to Description + Unit, then Description only.
          </DialogDescription>
        </DialogHeader>

        {step === "config" ? (
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Pricelist Year</Label>
              <Select value={yearId} onValueChange={setYearId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={years.length === 0 ? "No pricelists found" : "Select a year"} />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y.id} value={y.id}>{y.year} ({y.items.length} items)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Sections to update</Label>
              <div className="flex flex-col gap-2 rounded-md border p-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={doMaterials} onCheckedChange={(v) => setDoMaterials(!!v)} />
                  Materials <span className="text-muted-foreground">(updates Unit Cost)</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={doLabor} onCheckedChange={(v) => setDoLabor(!!v)} />
                  Labor <span className="text-muted-foreground">(updates Wage Rate)</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={doEquipment} onCheckedChange={(v) => setDoEquipment(!!v)} />
                  Equipment <span className="text-muted-foreground">(updates Rate)</span>
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Any matched row's manual formula on the price cell will be cleared. Quantities, man-days and periods are never touched.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handlePreview} disabled={!yearId || (!doMaterials && !doLabor && !doEquipment)}>
                Preview <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <ReviewStep
            templates={templates}
            isBulk={isBulk}
            matched={matched}
            unmatched={unmatched}
            setUnmatched={setUnmatched}
            sectionLabel={sectionLabel}
            tierBadge={tierBadge}
            onBack={() => { if (isDirty) setConfirmClose(true); else setStep("config"); }}
            onCancel={requestClose}
            onApply={applyUpdate}
          />
        )}
      </DialogContent>
    </Dialog>
    <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard changes?</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved edits in the review step (unmatched item actions or custom prices). Closing now will lose them.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep editing</AlertDialogCancel>
          <AlertDialogAction onClick={() => { setConfirmClose(false); onOpenChange(false); }}>Discard</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

interface ReviewStepProps {
  templates: DUPATemplate[];
  isBulk: boolean;
  matched: MatchedPreview[];
  unmatched: UnmatchedRow[];
  setUnmatched: React.Dispatch<React.SetStateAction<UnmatchedRow[]>>;
  sectionLabel: (s: Section) => string;
  tierBadge: (t: MatchTier) => JSX.Element;
  onBack: () => void;
  onCancel: () => void;
  onApply: () => void;
}

function ReviewStep({ templates, isBulk, matched, unmatched, setUnmatched, sectionLabel, tierBadge, onBack, onCancel, onApply }: ReviewStepProps) {
  
  const activeTemplates = useMemo(() => {
    const ids = new Set<string>();
    matched.forEach((m) => ids.add(m.templateId));
    unmatched.forEach((u) => ids.add(u.templateId));
    return templates.filter((t) => ids.has(t.id));
  }, [templates, matched, unmatched]);

  const [cursor, setCursor] = useState(0);
  useEffect(() => { setCursor(0); }, [activeTemplates.length]);

  if (activeTemplates.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">No applicable items found in selected templates.</p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onBack}>Back</Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </DialogFooter>
      </div>
    );
  }

  const current = activeTemplates[Math.min(cursor, activeTemplates.length - 1)];
  const tplMatched = matched.filter((m) => m.templateId === current.id);
  const tplUnmatched = unmatched.filter((u) => u.templateId === current.id);

  const totalUnmatchedUnresolved = unmatched.filter((u) => u.action === "keep").length;

  const setAllUnmatchedForTemplate = (action: UnmatchedAction) => {
    setUnmatched((arr) => arr.map((u) => u.templateId === current.id ? { ...u, action } : u));
  };

  
  const [matchedPage, setMatchedPage] = useState(0);
  const [unmatchedPage, setUnmatchedPage] = useState(0);
  const PAGE = 8;
  useEffect(() => { setMatchedPage(0); setUnmatchedPage(0); }, [current.id]);

  const filteredUnmatchedIdx = unmatched
    .map((u, i) => ({ u, i }))
    .filter((x) => x.u.templateId === current.id);

  const matchedPages = Math.max(1, Math.ceil(tplMatched.length / PAGE));
  const unmatchedPages = Math.max(1, Math.ceil(filteredUnmatchedIdx.length / PAGE));
  const mP = Math.min(matchedPage, matchedPages - 1);
  const uP = Math.min(unmatchedPage, unmatchedPages - 1);
  const matchedView = tplMatched.slice(mP * PAGE, mP * PAGE + PAGE);
  const unmatchedView = filteredUnmatchedIdx.slice(uP * PAGE, uP * PAGE + PAGE);

  return (
    <div className="space-y-4">
      {}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-md border bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500/30 p-2 text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Updated
          </div>
          <div className="text-lg font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">{matched.length}</div>
        </div>
        <div className="rounded-md border bg-amber-50/40 dark:bg-amber-950/20 border-amber-500/30 p-2 text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <AlertTriangle className="h-3 w-3 text-amber-600" /> Not in pricelist
          </div>
          <div className="text-lg font-semibold text-amber-700 dark:text-amber-400 tabular-nums">{unmatched.length}</div>
        </div>
        <div className="rounded-md border bg-muted/30 p-2 text-center">
          <div className="text-xs text-muted-foreground">DUPAs in this run</div>
          <div className="text-lg font-semibold tabular-nums">{activeTemplates.length}</div>
        </div>
      </div>

      {}
      {isBulk ? (
        <div className="flex items-center gap-2 rounded-md border p-2 bg-muted/20">
          <Button size="sm" variant="outline" disabled={cursor === 0} onClick={() => setCursor((c) => Math.max(0, c - 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <Select value={current.id} onValueChange={(id) => {
              const i = activeTemplates.findIndex((t) => t.id === id);
              if (i >= 0) setCursor(i);
            }}>
              <SelectTrigger className="h-9 text-sm w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {activeTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="truncate inline-block max-w-[420px] align-middle">
                      {t.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-[11px] text-muted-foreground mt-1 text-center">
              DUPA {cursor + 1} of {activeTemplates.length} · {tplMatched.length} updated · {tplUnmatched.length} unmatched
            </div>
          </div>
          <Button size="sm" variant="outline" disabled={cursor >= activeTemplates.length - 1} onClick={() => setCursor((c) => Math.min(activeTemplates.length - 1, c + 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="text-sm font-medium truncate" title={current.name}>{current.name}</div>
      )}

      {}
      <div className="rounded-md border bg-muted/30 p-3">
        <p className="text-sm font-medium">
          {tplMatched.length} item{tplMatched.length === 1 ? "" : "s"} will be updated
        </p>
        {matchedView.length > 0 && (
          <div className="mt-2">
            <table className="w-full text-xs table-fixed">
              <colgroup>
                <col className="w-[80px]" />
                <col />
                <col className="w-[70px]" />
                <col className="w-[90px]" />
                <col className="w-[90px]" />
              </colgroup>
              <thead className="text-muted-foreground">
                <tr className="text-left">
                  <th className="py-1 pr-2">Section</th>
                  <th className="py-1 pr-2">Description</th>
                  <th className="py-1 pr-2">Match</th>
                  <th className="py-1 pr-2 text-right">Old</th>
                  <th className="py-1 pr-2 text-right">New</th>
                </tr>
              </thead>
              <tbody>
                {matchedView.map((m, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-1 pr-2">{sectionLabel(m.section)}</td>
                    <td className="py-1 pr-2 truncate" title={m.description}>{m.description}</td>
                    <td className="py-1 pr-2">{tierBadge(m.tier)}</td>
                    <td className="py-1 pr-2 text-right tabular-nums text-muted-foreground">₱{formatCurrency(m.oldPrice)}</td>
                    <td className={`py-1 pr-2 text-right tabular-nums font-medium ${m.newPrice !== m.oldPrice ? "text-primary" : ""}`}>₱{formatCurrency(m.newPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {matchedPages > 1 && (
              <Pager page={mP} pages={matchedPages} onChange={setMatchedPage} />
            )}
          </div>
        )}
      </div>

      {}
      {tplUnmatched.length > 0 && (
        <div className="rounded-md border border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20 p-3">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-start gap-2 min-w-0">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {tplUnmatched.length} item{tplUnmatched.length === 1 ? "" : "s"} not found in this pricelist year
                </p>
                <p className="text-xs text-muted-foreground">Keep, zero, or enter a custom price.</p>
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAllUnmatchedForTemplate("keep")}>Keep all</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAllUnmatchedForTemplate("zero")}>Zero all</Button>
            </div>
          </div>
          <div>
            <table className="w-full text-xs table-fixed">
              <colgroup>
                <col className="w-[80px]" />
                <col />
                <col className="w-[80px]" />
                <col className="w-[140px]" />
                <col className="w-[120px]" />
              </colgroup>
              <thead className="text-muted-foreground">
                <tr className="text-left">
                  <th className="py-1 pr-2">Section</th>
                  <th className="py-1 pr-2">Description</th>
                  <th className="py-1 pr-2 text-right">Current</th>
                  <th className="py-1 pr-2">Action</th>
                  <th className="py-1 pr-2 text-right">New Price</th>
                </tr>
              </thead>
              <tbody>
                {unmatchedView.map(({ u, i }) => (
                  <tr key={i} className="border-t align-top">
                    <td className="py-1 pr-2">{sectionLabel(u.section)}</td>
                    <td className="py-1 pr-2 min-w-0">
                      <div className="truncate" title={u.description}>{u.description}</div>
                      {u.specification && <div className="text-[10px] text-muted-foreground truncate" title={u.specification}>{u.specification}</div>}
                    </td>
                    <td className="py-1 pr-2 text-right tabular-nums">₱{formatCurrency(u.currentPrice)}</td>
                    <td className="py-1 pr-2">
                      <Select
                        value={u.action}
                        onValueChange={(v) => setUnmatched((arr) => arr.map((x, j) => j === i ? { ...x, action: v as UnmatchedAction } : x))}
                      >
                        <SelectTrigger className="h-7 text-xs w-[130px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="keep">Keep current</SelectItem>
                          <SelectItem value="zero">Set to 0</SelectItem>
                          <SelectItem value="custom">Custom price</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-1 pr-2 text-right">
                      {u.action === "custom" ? (
                        <NumberField
                          value={Number.isFinite(u.customPrice) ? u.customPrice : 0}
                          onValueChange={(n) =>
                            setUnmatched((arr) => arr.map((x, j) => j === i ? { ...x, customPrice: n } : x))
                          }
                          className="h-7 text-xs w-[110px] ml-auto text-right tabular-nums"
                        />
                      ) : (
                        <span className="text-muted-foreground tabular-nums">
                          ₱{formatCurrency(u.action === "zero" ? 0 : u.currentPrice)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {unmatchedPages > 1 && (
              <Pager page={uP} pages={unmatchedPages} onChange={setUnmatchedPage} />
            )}
          </div>
        </div>
      )}

      <DialogFooter className="gap-2 sm:justify-between">
        <div className="text-xs text-muted-foreground self-center">
          {totalUnmatchedUnresolved > 0 && (
            <span>{totalUnmatchedUnresolved} unmatched will keep current price across all DUPAs.</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>Back</Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={onApply} disabled={matched.length === 0 && unmatched.every((u) => u.action === "keep")}>
            Apply Update
          </Button>
        </div>
      </DialogFooter>
    </div>
  );
}

function Pager({ page, pages, onChange }: { page: number; pages: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-end gap-2 pt-2 text-xs text-muted-foreground">
      <Button size="sm" variant="ghost" className="h-6 px-2" disabled={page === 0} onClick={() => onChange(page - 1)}>
        <ChevronLeft className="h-3 w-3" />
      </Button>
      <span className="tabular-nums">{page + 1} / {pages}</span>
      <Button size="sm" variant="ghost" className="h-6 px-2" disabled={page >= pages - 1} onClick={() => onChange(page + 1)}>
        <ChevronRight className="h-3 w-3" />
      </Button>
    </div>
  );
}
