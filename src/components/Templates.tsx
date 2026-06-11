import { useState, useRef } from "react";
import { Plus, Trash2, Search, BookOpen, Package, FolderOpen, ShoppingCart, Upload, AlertTriangle, ArrowDownAZ, ArrowUpAZ, LayoutGrid, List, Grid2x2, Grid3x3, Rows3, RefreshCw } from "lucide-react";
import UpdatePricelistDialog from "@/components/UpdatePricelistDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DUPATemplate, GeneralCategoryTemplate, GeneralCategoryTemplateItem, MaterialItem, LaborItem, EquipmentItem, PriceListItem, Project } from "@/types";
import { getTemplates, saveTemplate, deleteTemplate, saveTemplates, getGeneralTemplates, saveGeneralTemplate, deleteGeneralTemplate, saveGeneralTemplates } from "@/lib/templates";
import { formatCurrency, resolveDupaFormulaSections } from "@/lib/calculations";
import { ColorizedFormulaText } from "@/components/formula-cell";
import { FormulaCell, PickCell, useFormulaPicker } from "@/components/formula-cell";
import { loadPriceList } from "@/components/PriceList";
import { importDupaFromExcel, ImportedDupaData } from "@/lib/importDupaTemplate";
import { createSampleDupaTemplates, createSampleGeneralTemplates } from "@/lib/sampleTemplates";
import { toast } from "@/hooks/use-toast";
import { NumberField } from "@/components/ui/number-field";
import { UnitCombobox } from "@/components/ui/unit-combobox";
import { SpecText, composeSpec } from "@/components/ui/spec-badge";
import { backfillMaterials, backfillLabor, backfillEquipment } from "@/lib/specBackfill";
import {
  createDefaultEquipment,
  createDefaultEquipmentRows,
  createDefaultLabor,
  createDefaultLaborRows,
  createDefaultMaterial,
  createDefaultMaterials,
  ensureMinimumDupaRows,
} from "@/lib/dupaDefaults";

interface Props {
  compact?: boolean;
  project?: Project;
}

type SortKey = "name-asc" | "name-desc" | "created-desc" | "created-asc" | "modified-desc" | "modified-asc";
type ViewSize = "xs" | "sm" | "md" | "lg";

const VIEW_GRID_CLASS: Record<ViewSize, string> = {
  xs: "grid grid-cols-1 gap-1.5",
  sm: "grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6",
  md: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
  lg: "grid gap-4 grid-cols-1 lg:grid-cols-2",
};

function sortTemplates<T extends { name: string; createdAt: string; updatedAt?: string }>(items: T[], key: SortKey): T[] {
  const arr = [...items];
  const cmpStr = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base" });
  const modOf = (t: T) => t.updatedAt || t.createdAt;
  switch (key) {
    case "name-asc": arr.sort((a, b) => cmpStr(a.name, b.name)); break;
    case "name-desc": arr.sort((a, b) => cmpStr(b.name, a.name)); break;
    case "created-asc": arr.sort((a, b) => a.createdAt.localeCompare(b.createdAt)); break;
    case "created-desc": arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); break;
    case "modified-asc": arr.sort((a, b) => modOf(a).localeCompare(modOf(b))); break;
    case "modified-desc": arr.sort((a, b) => modOf(b).localeCompare(modOf(a))); break;
  }
  return arr;
}

function ListControls({ sort, onSortChange, view, onViewChange }: { sort: SortKey; onSortChange: (s: SortKey) => void; view: ViewSize; onViewChange: (v: ViewSize) => void }) {
  const viewBtn = (v: ViewSize, Icon: any, label: string) => (
    <Button
      key={v}
      type="button"
      size="sm"
      variant={view === v ? "default" : "ghost"}
      className="h-7 w-7 p-0"
      title={label}
      onClick={() => onViewChange(v)}
    >
      <Icon className="h-3.5 w-3.5" />
    </Button>
  );
  return (
    <div className="flex items-center gap-2">
      <Select value={sort} onValueChange={(v) => onSortChange(v as SortKey)}>
        <SelectTrigger className="h-8 w-[180px] text-xs">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name-asc">Name (A → Z)</SelectItem>
          <SelectItem value="name-desc">Name (Z → A)</SelectItem>
          <SelectItem value="created-desc">Date created (newest)</SelectItem>
          <SelectItem value="created-asc">Date created (oldest)</SelectItem>
          <SelectItem value="modified-desc">Last modified (newest)</SelectItem>
          <SelectItem value="modified-asc">Last modified (oldest)</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex items-center rounded-md border p-0.5">
        {viewBtn("xs", List, "Very small (list)")}
        {viewBtn("sm", Grid3x3, "Small")}
        {viewBtn("md", Grid2x2, "Medium")}
        {viewBtn("lg", LayoutGrid, "Large")}
      </div>
    </div>
  );
}

export default function Templates({ compact = false, project }: Props) {
  return (
    <div className="mt-4">
      <Tabs defaultValue="dupa">
        <TabsList>
          <TabsTrigger value="dupa">DUPA Templates</TabsTrigger>
          <TabsTrigger value="general">General Category Templates</TabsTrigger>
        </TabsList>
        <TabsContent value="dupa">
          <DUPATemplatesSection compact={compact} project={project} />
        </TabsContent>
        <TabsContent value="general">
          <GeneralTemplatesSection compact={compact} project={project} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DUPATemplatesSection({ compact, project }: { compact: boolean; project?: Project }) {
  const [templates, setTemplates] = useState<DUPATemplate[]>(() => {
    
    
    const all = getTemplates();
    return all.map((t) => ({
      ...t,
      materials: backfillMaterials(t.materials),
      labor: backfillLabor(t.labor),
      equipment: backfillEquipment(t.equipment),
    }));
  });
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<DUPATemplate | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewTemplate, setViewTemplate] = useState<DUPATemplate | null>(null);
  const [updatePriceTargets, setUpdatePriceTargets] = useState<DUPATemplate[] | null>(null);

  // Import state
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<ImportedDupaData | null>(null);
  const [importWarningOpen, setImportWarningOpen] = useState(false);
  const [importPending, setImportPending] = useState<ImportedDupaData | null>(null);

  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formUnit, setFormUnit] = useState("");
  const [formQty, setFormQty] = useState(1);
  const [formOcm, setFormOcm] = useState(8);
  const [formProfit, setFormProfit] = useState(8);
  const [formVat, setFormVat] = useState(12);
  const [formMaterials, setFormMaterials] = useState<MaterialItem[]>([]);
  const [formLabor, setFormLabor] = useState<LaborItem[]>([]);
  const [formEquipment, setFormEquipment] = useState<EquipmentItem[]>([]);
  const [formulaPortalEl, setFormulaPortalEl] = useState<HTMLDivElement | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState<string>("");
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

  const currentSnapshot = () => JSON.stringify({
    formName, formDesc, formUnit, formQty, formOcm, formProfit, formVat,
    formMaterials, formLabor, formEquipment,
  });
  const isDirty = () => createOpen && currentSnapshot() !== initialSnapshot;
  const handleCreateOpenChange = (open: boolean) => {
    if (!open && isDirty()) { setConfirmCloseOpen(true); return; }
    setCreateOpen(open);
  };

  // Price list picker state
  const [plPickerOpen, setPlPickerOpen] = useState(false);
  const [plPickerTarget, setPlPickerTarget] = useState<{ section: "material" | "labor" | "equipment"; index: number } | null>(null);
  const [plSearch, setPlSearch] = useState("");
  const [plFilterCat, setPlFilterCat] = useState("all");
  const [plYearId, setPlYearId] = useState("");

  const priceListYears = loadPriceList();
  const plYear = priceListYears.find((y) => y.id === plYearId);

  const getFilteredPlItems = () => {
    if (!plYear) return [];
    let items = plYear.items;
    if (plFilterCat !== "all") items = items.filter((i) => i.categoryId === plFilterCat);
    if (plSearch.trim()) {
      const q = plSearch.toLowerCase();
      items = items.filter((i) => i.description.toLowerCase().includes(q) || i.unit.toLowerCase().includes(q));
    }
    return items;
  };

  const openPlPicker = (section: "material" | "labor" | "equipment", index: number) => {
    setPlPickerTarget({ section, index });
    setPlSearch("");
    setPlFilterCat("all");
    const set = project?.activePriceListYearId;
    const defaultId = set && priceListYears.find((y) => y.id === set)
      ? set
      : (priceListYears.length > 0 ? priceListYears[priceListYears.length - 1].id : "");
    setPlYearId(defaultId);
    setPlPickerOpen(true);
  };

  const refresh = () => setTemplates(getTemplates());

  const handlePickPlItem = (plItem: PriceListItem) => {
    if (!plPickerTarget) return;
    const { section, index } = plPickerTarget;
    const spec = composeSpec(plItem.extraDesc1, plItem.extraDesc2);
    if (section === "material") {
      const total = plItem.marketPrice * plItem.markupPrice;
      setFormMaterials(formMaterials.map((m, i) => i === index ? { ...m, description: plItem.description, specification: spec, unit: plItem.unit, unitCost: total } : m));
    } else if (section === "labor") {
      const total = plItem.marketPrice * plItem.markupPrice;
      setFormLabor(formLabor.map((l, i) => i === index ? { ...l, description: plItem.description, specification: spec, wageRate: total } : l));
    } else {
      const total = plItem.marketPrice * plItem.markupPrice;
      setFormEquipment(formEquipment.map((e, i) => i === index ? { ...e, description: plItem.description, specification: spec, rate: total } : e));
    }
    setPlPickerOpen(false);
    setPlPickerTarget(null);
  };

  const [sortKey, setSortKey] = useState<SortKey>("name-asc");
  const [viewSize, setViewSize] = useState<ViewSize>("md");

  
  const resolved = resolveDupaFormulaSections(formQty, formMaterials, formLabor, formEquipment);
  const resolvedSummary = calcTemplatePreviewSummary(formQty, resolved, (formOcm || 0) + (formProfit || 0), formVat);

  
  
  const picker = useFormulaPicker({ qty: formQty, refs: resolved.refs }, formulaPortalEl);

  const viewResolved = viewTemplate
    ? resolveDupaFormulaSections(viewTemplate.quantity || 0, viewTemplate.materials, viewTemplate.labor, viewTemplate.equipment)
    : null;
  const viewSummary = viewTemplate && viewResolved
    ? calcTemplatePreviewSummary(viewTemplate.quantity || 0, viewResolved, viewTemplate.indirectCostPercent, viewTemplate.vatPercent)
    : null;

  const filtered = sortTemplates(
    templates.filter((t) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    }),
    sortKey,
  );

  const openCreate = () => {
    const mats = createDefaultMaterials(), labs = createDefaultLaborRows(), eqs = createDefaultEquipmentRows();
    setFormName(""); setFormDesc(""); setFormUnit(""); setFormQty(1);
    setFormOcm(8); setFormProfit(8); setFormVat(12);
    setFormMaterials(mats); setFormLabor(labs); setFormEquipment(eqs);
    setInitialSnapshot(JSON.stringify({
      formName: "", formDesc: "", formUnit: "", formQty: 1,
      formOcm: 8, formProfit: 8, formVat: 12,
      formMaterials: mats, formLabor: labs, formEquipment: eqs,
    }));
    setCreateOpen(true); setEditTemplate(null);
  };

  const openEdit = (t: DUPATemplate) => {
    const half = (t.indirectCostPercent ?? 16) / 2;
    const mats = ensureMinimumDupaRows([...t.materials], 5, createDefaultMaterial);
    const labs = ensureMinimumDupaRows([...t.labor], 5, createDefaultLabor);
    const eqs = ensureMinimumDupaRows([...t.equipment], 5, createDefaultEquipment);
    setFormName(t.name); setFormDesc(t.description); setFormUnit(t.unit); setFormQty(t.quantity || 1);
    // Split legacy indirectCostPercent evenly between OCM and Profit if no split exists
    setFormOcm(half); setFormProfit(half);
    setFormVat(t.vatPercent);
    setFormMaterials(mats); setFormLabor(labs); setFormEquipment(eqs);
    setInitialSnapshot(JSON.stringify({
      formName: t.name, formDesc: t.description, formUnit: t.unit, formQty: t.quantity || 1,
      formOcm: half, formProfit: half, formVat: t.vatPercent,
      formMaterials: mats, formLabor: labs, formEquipment: eqs,
    }));
    setEditTemplate(t); setCreateOpen(true);
  };

  const handleSave = () => {
    const template: DUPATemplate = {
      id: editTemplate?.id || crypto.randomUUID(),
      name: formName.trim() || "Untitled Template",
      description: formDesc, unit: formUnit, quantity: formQty,
      materials: formMaterials.filter((m) => m.description.trim()),
      labor: formLabor.filter((l) => l.description.trim()),
      equipment: formEquipment.filter((e) => e.description.trim()),
      indirectCostPercent: (formOcm || 0) + (formProfit || 0), vatPercent: formVat,
      createdAt: editTemplate?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveTemplate(template); refresh(); setCreateOpen(false);
    toast({ title: editTemplate ? "Template updated" : "Template created" });
  };

  const handleDelete = () => {
    if (deleteId) { deleteTemplate(deleteId); refresh(); setDeleteId(null); toast({ title: "Template deleted" }); }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const imported = await importDupaFromExcel(file);
      if (imported.outOfScopeRefs.length > 0) {
        setImportPending(imported);
        setImportWarningOpen(true);
      } else {
        applyImport(imported);
      }
    } catch (err) {
      toast({ title: "Import failed", description: String(err), variant: "destructive" });
    }
  };

  const applyImport = (data: ImportedDupaData) => {
    setFormName(data.name);
    setFormDesc(data.description);
    setFormUnit(data.unit); setFormQty(data.quantity || 1);
    const halfImp = (data.indirectCostPercent ?? 16) / 2;
    setFormOcm(halfImp); setFormProfit(halfImp);
    setFormVat(data.vatPercent);
    setFormMaterials(ensureMinimumDupaRows(data.materials, 5, createDefaultMaterial));
    setFormLabor(ensureMinimumDupaRows(data.labor, 5, createDefaultLabor));
    setFormEquipment(ensureMinimumDupaRows(data.equipment, 5, createDefaultEquipment));
    setEditTemplate(null);
    setCreateOpen(true);
    toast({ title: "DUPA imported", description: `${data.materials.length} materials, ${data.labor.length} labor, ${data.equipment.length} equipment items loaded.` });
  };

  const handleImportProceed = () => {
    if (importPending) applyImport(importPending);
    setImportWarningOpen(false);
    setImportPending(null);
  };

  const handleImportCancel = () => {
    setImportWarningOpen(false);
    setImportPending(null);
  };

  function updateFormMaterial(i: number, field: string, value: string) {
    setFormMaterials(formMaterials.map((m, j) => {
      if (j !== i) return m;
      if (field === "quantity" || field === "unitCost") return { ...m, [field]: parseFloat(value) || 0 };
      return { ...m, [field]: value };
    }));
  }

  function updateFormLabor(i: number, field: string, value: string) {
    setFormLabor(formLabor.map((l, j) => {
      if (j !== i) return l;
      if (field === "manDays" || field === "wageRate") return { ...l, [field]: parseFloat(value) || 0 };
      return { ...l, [field]: value };
    }));
  }

  function updateFormEquip(i: number, field: string, value: string) {
    setFormEquipment(formEquipment.map((e, j) => {
      if (j !== i) return e;
      if (field === "period" || field === "rate") return { ...e, [field]: parseFloat(value) || 0 };
      return { ...e, [field]: value };
    }));
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search DUPA templates..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button size="sm" variant="outline" onClick={() => importFileRef.current?.click()}>
          <Upload className="h-4 w-4 mr-1" /> Import from Excel
        </Button>
        <input ref={importFileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportFile} />
        <Button size="sm" variant="outline" onClick={() => {
          const samples = createSampleDupaTemplates();
          const existing = getTemplates();
          const newOnes = samples.filter(s => !existing.some(e => e.name === s.name));
          if (newOnes.length === 0) { toast({ title: "All sample templates already exist" }); return; }
          saveTemplates([...existing, ...newOnes]);
          refresh();
          toast({ title: `Loaded ${newOnes.length} sample DUPA templates` });
        }}>
          <Package className="h-4 w-4 mr-1" /> Load Samples
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const all = getTemplates();
            if (all.length === 0) { toast({ title: "No templates to update" }); return; }
            setUpdatePriceTargets(all);
          }}
        >
          <RefreshCw className="h-4 w-4 mr-1" /> Update All from Pricelist
        </Button>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New DUPA Template</Button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{filtered.length} {filtered.length === 1 ? "template" : "templates"}</p>
        <ListControls sort={sortKey} onSortChange={setSortKey} view={viewSize} onViewChange={setViewSize} />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No DUPA templates yet</p>
          <p className="text-sm">Create reusable DUPA templates to quickly populate work items.</p>
        </div>
      ) : viewSize === "xs" ? (
        <div className={VIEW_GRID_CLASS.xs}>
          {filtered.map((t) => (
            <div key={t.id} className="flex items-center gap-2 border rounded-md px-3 py-1.5 hover:border-primary/50 transition-colors">
              <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{t.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{t.description} ({t.unit})</p>
              </div>
              <span className="text-[10px] text-muted-foreground hidden sm:inline whitespace-nowrap">
                {new Date(t.updatedAt || t.createdAt).toLocaleDateString()}
              </span>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setViewTemplate(t)}>View</Button>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => openEdit(t)}>Edit</Button>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title="Update prices from a pricelist year" onClick={() => setUpdatePriceTargets([t])}>
                <RefreshCw className="h-3 w-3 text-primary" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setDeleteId(t.id)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className={VIEW_GRID_CLASS[viewSize]}>
          {filtered.map((t) => {
            const isSmall = viewSize === "sm";
            const isLarge = viewSize === "lg";
            return (
              <div key={t.id} className={`border rounded-lg hover:border-primary/50 transition-colors ${isSmall ? "p-2.5" : isLarge ? "p-5" : "p-4"}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0">
                    <h3 className={`font-semibold ${isSmall ? "text-xs" : "text-sm"} truncate`}>{t.name}</h3>
                    <p className={`${isSmall ? "text-[10px]" : "text-xs"} text-muted-foreground ${isSmall ? "truncate" : ""}`}>{t.description} ({t.unit})</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setDeleteId(t.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
                {!isSmall && (
                  <div className="text-xs text-muted-foreground space-y-0.5 mb-3">
                    <p>
                      {t.materials.filter(m => m.description.trim() || m.quantity || m.unitCost).length} materials •{" "}
                      {t.labor.filter(l => l.description.trim() || l.manDays || l.wageRate).length} labor •{" "}
                      {t.equipment.filter(e => e.description.trim() || e.period || e.rate).length} equipment
                    </p>
                    <p>Indirect: {t.indirectCostPercent}% • VAT: {t.vatPercent}%</p>
                    {isLarge && (
                      <p>Modified: {new Date(t.updatedAt || t.createdAt).toLocaleString()}</p>
                    )}
                    {t.materials.some(m => m.quantityFormula) && <p className="text-primary/70">🔗 Has formulas</p>}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-xs h-7 flex-1" onClick={() => setViewTemplate(t)}><BookOpen className="h-3 w-3 mr-1" /> View</Button>
                  <Button size="sm" variant="outline" className="text-xs h-7 flex-1" onClick={() => openEdit(t)}>Edit</Button>
                  <Button size="sm" variant="outline" className="text-xs h-7 px-2" title="Update prices from a pricelist year" onClick={() => setUpdatePriceTargets([t])}>
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {}
      <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
        <DialogContent
          className="w-screen max-w-none h-screen max-h-screen rounded-none p-0 flex flex-col gap-0 left-0 top-0 translate-x-0 translate-y-0 border-0"
          onPointerDownOutside={(e) => {
            const t = e.target as HTMLElement | null;
            if (t?.closest('[data-formula-portal="true"]')) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            const t = e.target as HTMLElement | null;
            if (t?.closest('[data-formula-portal="true"]')) e.preventDefault();
          }}
        >
          <div className="px-6 pt-5 pb-3 border-b shrink-0">
           <DialogHeader>
             <DialogTitle>{editTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
             <DialogDescription>
               Define a reusable DUPA template. Click <kbd className="px-1 py-0.5 rounded bg-muted text-foreground font-mono">fx</kbd> on any number cell or type <kbd className="px-1 py-0.5 rounded bg-muted text-foreground">=</kbd> to enter a formula. Click any other cell while editing to insert its reference.
             </DialogDescription>
           </DialogHeader>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div ref={setFormulaPortalEl} className="sticky top-0 z-40" />
            <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 space-y-4">
            <div className="grid gap-3 lg:grid-cols-4">
              <div className="lg:col-span-2">
                <Label className="text-sm">Template Name</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., Concrete Works Class A" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Unit</Label>
                <div className="mt-1">
                  <UnitCombobox value={formUnit} onChange={setFormUnit} placeholder="Select unit" />
                </div>
              </div>
              <div>
                <Label className="text-sm">Qty</Label>
                <NumberField value={formQty} onValueChange={setFormQty} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Work item description" className="mt-1" />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label className="text-sm">OCM %</Label>
                <NumberField value={formOcm} onValueChange={setFormOcm} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Markup (Profit) %</Label>
                <NumberField value={formProfit} onValueChange={setFormProfit} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">VAT %</Label>
                <NumberField value={formVat} onValueChange={setFormVat} className="mt-1" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">Indirect Cost % = OCM + Markup = <span className="font-semibold text-foreground">{((formOcm || 0) + (formProfit || 0)).toFixed(2)}%</span></p>
            <div className="pt-2" />
            <TemplateSection title="A. Materials" items={formMaterials} subtotal={resolvedSummary.totalMaterials}
              onAdd={() => setFormMaterials([...formMaterials, createDefaultMaterial()])}
              onRemove={(id) => setFormMaterials(formMaterials.filter((m) => m.id !== id))}
              onPickFromPriceList={(i) => openPlPicker("material", i)}
              renderRow={(m, i) => (
                <tr key={m.id}>
                  <td className="p-1 text-center text-xs font-mono text-muted-foreground">A{i + 1}</td>
                  <td className="p-1 align-top"><AutoTextarea value={m.description} onChange={(v) => updateFormMaterial(i, "description", v)} placeholder="" /><SpecText spec={m.specification} size="xs" /></td>
                  <FormulaCell ref_={`A${i + 1}`} value={resolved.materials[i]?.quantity ?? m.quantity}
                    onValueChange={(v) => updateFormMaterial(i, "quantity", v)}
                    formula={m.quantityFormula || ""}
                    onFormulaChange={(v) => updateFormMaterial(i, "quantityFormula", v)}
                    proMode={false} placeholder="qty * 0.5" picker={picker} />
                  <td className="p-1"><UnitCombobox size="sm" value={m.unit} onChange={(v) => updateFormMaterial(i, "unit", v)} /></td>
                  <FormulaCell ref_={`A${i + 1}.u`} value={resolved.materials[i]?.unitCost ?? m.unitCost}
                    onValueChange={(v) => updateFormMaterial(i, "unitCost", v)}
                    formula={m.unitCostFormula || ""}
                    onFormulaChange={(v) => updateFormMaterial(i, "unitCostFormula", v)}
                    proMode={false} placeholder="A1.u * 1.1" picker={picker} />
                  <PickCell ref_={`A${i + 1}.t`} picker={picker} className="text-right text-xs tabular-nums">
                    <span className="text-muted-foreground/80">₱{formatCurrency(resolved.materials[i]?.total ?? (m.quantity * m.unitCost))}</span>
                  </PickCell>
                  <td className="p-1 whitespace-nowrap">
                    <Button variant="ghost" size="icon" className="h-6 w-6" title="Pick from Price List" onClick={() => openPlPicker("material", i)}><ShoppingCart className="h-3 w-3 text-primary" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFormMaterials(formMaterials.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </td>
                </tr>
              )}
              headers={["Ref", "Description", "Qty", "Unit", "Unit Cost", "Total", ""]}
            />
            <TemplateSection title="B. Labor" items={formLabor} subtotal={resolvedSummary.totalLabor}
              onAdd={() => setFormLabor([...formLabor, createDefaultLabor()])}
              onRemove={(id) => setFormLabor(formLabor.filter((l) => l.id !== id))}
              onPickFromPriceList={(i) => openPlPicker("labor", i)}
              renderRow={(l, i) => (
                <tr key={l.id}>
                  <td className="p-1 text-center text-xs font-mono text-muted-foreground">B{i + 1}</td>
                  <td className="p-1 align-top"><AutoTextarea value={l.description} onChange={(v) => updateFormLabor(i, "description", v)} placeholder="" /><SpecText spec={l.specification} size="xs" /></td>
                  <FormulaCell ref_={`B${i + 1}`} value={resolved.labor[i]?.manDays ?? l.manDays}
                    onValueChange={(v) => updateFormLabor(i, "manDays", v)}
                    formula={l.manDaysFormula || ""}
                    onFormulaChange={(v) => updateFormLabor(i, "manDaysFormula", v)}
                    proMode={false} placeholder="qty * 0.1" picker={picker} />
                  <FormulaCell ref_={`B${i + 1}.w`} value={resolved.labor[i]?.wageRate ?? l.wageRate}
                    onValueChange={(v) => updateFormLabor(i, "wageRate", v)}
                    formula={l.wageRateFormula || ""}
                    onFormulaChange={(v) => updateFormLabor(i, "wageRateFormula", v)}
                    proMode={false} placeholder="500 * 1.1" picker={picker} />
                  <PickCell ref_={`B${i + 1}.t`} picker={picker} className="text-right text-xs tabular-nums">
                    <span className="text-muted-foreground/80">₱{formatCurrency(resolved.labor[i]?.total ?? (l.manDays * l.wageRate))}</span>
                  </PickCell>
                  <td className="p-1 whitespace-nowrap">
                    <Button variant="ghost" size="icon" className="h-6 w-6" title="Pick from Price List" onClick={() => openPlPicker("labor", i)}><ShoppingCart className="h-3 w-3 text-primary" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFormLabor(formLabor.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </td>
                </tr>
              )}
              headers={["Ref", "Description", "Man-Days", "Wage Rate", "Total", ""]}
            />
            <TemplateSection title="C. Equipment Utilization" items={formEquipment} subtotal={resolvedSummary.totalEquipment}
              onAdd={() => setFormEquipment([...formEquipment, createDefaultEquipment()])}
              onRemove={(id) => setFormEquipment(formEquipment.filter((e) => e.id !== id))}
              onPickFromPriceList={(i) => openPlPicker("equipment", i)}
              renderRow={(eq, i) => (
                <tr key={eq.id}>
                  <td className="p-1 text-center text-xs font-mono text-muted-foreground">C{i + 1}</td>
                  <td className="p-1 align-top"><AutoTextarea value={eq.description} onChange={(v) => updateFormEquip(i, "description", v)} placeholder="" /><SpecText spec={eq.specification} size="xs" /></td>
                  <FormulaCell ref_={`C${i + 1}`} value={resolved.equipment[i]?.period ?? eq.period}
                    onValueChange={(v) => updateFormEquip(i, "period", v)}
                    formula={eq.periodFormula || ""}
                    onFormulaChange={(v) => updateFormEquip(i, "periodFormula", v)}
                    proMode={false} placeholder="qty * 0.05" picker={picker} />
                  <FormulaCell ref_={`C${i + 1}.r`} value={resolved.equipment[i]?.rate ?? eq.rate}
                    onValueChange={(v) => updateFormEquip(i, "rate", v)}
                    formula={eq.rateFormula || ""}
                    onFormulaChange={(v) => updateFormEquip(i, "rateFormula", v)}
                    proMode={false} placeholder="1000 * 1.05" picker={picker} />
                  <PickCell ref_={`C${i + 1}.t`} picker={picker} className="text-right text-xs tabular-nums">
                    <span className="text-muted-foreground/80">₱{formatCurrency(resolved.equipment[i]?.total ?? (eq.period * eq.rate))}</span>
                  </PickCell>
                  <td className="p-1 whitespace-nowrap">
                    <Button variant="ghost" size="icon" className="h-6 w-6" title="Pick from Price List" onClick={() => openPlPicker("equipment", i)}><ShoppingCart className="h-3 w-3 text-primary" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFormEquipment(formEquipment.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </td>
                </tr>
              )}
              headers={["Ref", "Equipment", "Period", "Rate", "Total", ""]}
            />
            <TemplateSummaryCard
              ocmPercent={formOcm}
              profitPercent={formProfit}
              vatPercent={formVat}
              summary={resolvedSummary}
            />
            </div>
          </div>
          <DialogFooter className="px-4 py-3 border-t shrink-0 sm:px-6">
            <Button variant="outline" onClick={() => handleCreateOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formName.trim()}>{editTemplate ? "Update" : "Create"} Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={!!viewTemplate} onOpenChange={() => setViewTemplate(null)}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewTemplate?.name}</DialogTitle>
            <DialogDescription>{viewTemplate?.description}</DialogDescription>
          </DialogHeader>
          {viewTemplate && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2"><div className="text-muted-foreground">Quantity</div><div className="font-semibold text-sm">{viewTemplate.quantity || 0}</div></div>
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2"><div className="text-muted-foreground">Unit</div><div className="font-semibold text-sm">{viewTemplate.unit || "—"}</div></div>
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2"><div className="text-muted-foreground">Indirect</div><div className="font-semibold text-sm">{viewTemplate.indirectCostPercent}%</div></div>
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2"><div className="text-muted-foreground">VAT</div><div className="font-semibold text-sm">{viewTemplate.vatPercent}%</div></div>
              </div>

              <TemplateViewSection title="A. Materials" subtotal={viewSummary?.totalMaterials ?? 0}>
                <div className="overflow-x-auto">
                  <table className="table-grid w-full text-xs table-fixed border-0">
                    <colgroup>
                      <col style={{ width: "3rem" }} /><col /><col style={{ width: "9rem" }} /><col style={{ width: "6rem" }} /><col style={{ width: "5rem" }} /><col style={{ width: "8.5rem" }} />
                    </colgroup>
                    <thead><tr><th>Ref</th><th>Description</th><th className="text-right">Qty</th><th>Unit</th><th className="text-right">Unit Cost</th><th className="text-right">Total</th></tr></thead>
                    <tbody>{viewTemplate.materials.map((m, i) => (<tr key={m.id}><td className="font-mono text-muted-foreground align-top">A{i + 1}</td><td className="align-top"><div className="break-words">{m.description}</div><SpecText spec={m.specification} size="xs" /></td><td className="text-right align-top tabular-nums"><FxValueCell value={viewResolved?.materials[i]?.quantity ?? m.quantity} formula={m.quantityFormula} /></td><td className="align-top">{m.unit}</td><td className="text-right align-top tabular-nums"><FxValueCell prefix="₱" value={viewResolved?.materials[i]?.unitCost ?? m.unitCost} formula={m.unitCostFormula} /></td><td className="text-right align-top tabular-nums">₱{formatCurrency(viewResolved?.materials[i]?.total ?? (m.quantity * m.unitCost))}</td></tr>))}
                    {viewTemplate.materials.length === 0 && (<tr><td colSpan={6} className="text-center text-muted-foreground py-3">None</td></tr>)}</tbody>
                  </table>
                </div>
              </TemplateViewSection>

              <TemplateViewSection title="B. Labor" subtotal={viewSummary?.totalLabor ?? 0}>
                <div className="overflow-x-auto">
                  <table className="table-grid w-full text-xs table-fixed border-0">
                    <colgroup>
                      <col style={{ width: "3rem" }} /><col /><col style={{ width: "9rem" }} /><col style={{ width: "6.5rem" }} /><col style={{ width: "8.5rem" }} />
                    </colgroup>
                    <thead><tr><th>Ref</th><th>Description</th><th className="text-right">Man-Days</th><th className="text-right">Wage Rate</th><th className="text-right">Total</th></tr></thead>
                    <tbody>{viewTemplate.labor.map((l, i) => (<tr key={l.id}><td className="font-mono text-muted-foreground align-top">B{i + 1}</td><td className="align-top"><div className="break-words">{l.description}</div><SpecText spec={l.specification} size="xs" /></td><td className="text-right align-top tabular-nums"><FxValueCell value={viewResolved?.labor[i]?.manDays ?? l.manDays} formula={l.manDaysFormula} /></td><td className="text-right align-top tabular-nums"><FxValueCell prefix="₱" value={viewResolved?.labor[i]?.wageRate ?? l.wageRate} formula={l.wageRateFormula} /></td><td className="text-right align-top tabular-nums">₱{formatCurrency(viewResolved?.labor[i]?.total ?? (l.manDays * l.wageRate))}</td></tr>))}
                    {viewTemplate.labor.length === 0 && (<tr><td colSpan={5} className="text-center text-muted-foreground py-3">None</td></tr>)}</tbody>
                  </table>
                </div>
              </TemplateViewSection>

              <TemplateViewSection title="C. Equipment Utilization" subtotal={viewSummary?.totalEquipment ?? 0}>
                <div className="overflow-x-auto">
                  <table className="table-grid w-full text-xs table-fixed border-0">
                    <colgroup>
                      <col style={{ width: "3rem" }} /><col /><col style={{ width: "9rem" }} /><col style={{ width: "6.5rem" }} /><col style={{ width: "8.5rem" }} />
                    </colgroup>
                    <thead><tr><th>Ref</th><th>Equipment</th><th className="text-right">Period</th><th className="text-right">Rate</th><th className="text-right">Total</th></tr></thead>
                    <tbody>{viewTemplate.equipment.map((e, i) => (<tr key={e.id}><td className="font-mono text-muted-foreground align-top">C{i + 1}</td><td className="align-top"><div className="break-words">{e.description}</div><SpecText spec={e.specification} size="xs" /></td><td className="text-right align-top tabular-nums"><FxValueCell value={viewResolved?.equipment[i]?.period ?? e.period} formula={e.periodFormula} /></td><td className="text-right align-top tabular-nums"><FxValueCell prefix="₱" value={viewResolved?.equipment[i]?.rate ?? e.rate} formula={e.rateFormula} /></td><td className="text-right align-top tabular-nums">₱{formatCurrency(viewResolved?.equipment[i]?.total ?? (e.period * e.rate))}</td></tr>))}
                    {viewTemplate.equipment.length === 0 && (<tr><td colSpan={5} className="text-center text-muted-foreground py-3">None</td></tr>)}</tbody>
                  </table>
                </div>
              </TemplateViewSection>

              {viewSummary && (
                <TemplateReadOnlySummaryCard
                  indirectPercent={viewTemplate.indirectCostPercent}
                  vatPercent={viewTemplate.vatPercent}
                  summary={viewSummary}
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save changes?</AlertDialogTitle>
            <AlertDialogDescription>You have unsaved changes to this template. Do you want to save them before closing?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setConfirmCloseOpen(false)}>Keep Editing</Button>
            <Button variant="destructive" onClick={() => { setConfirmCloseOpen(false); setCreateOpen(false); }}>Discard</Button>
            <Button onClick={() => { setConfirmCloseOpen(false); if (formName.trim()) handleSave(); }} disabled={!formName.trim()}>Save</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Template?</AlertDialogTitle><AlertDialogDescription>This template will be permanently deleted.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {}
      <AlertDialog open={importWarningOpen} onOpenChange={setImportWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Out-of-Scope References Detected
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>The imported DUPA file contains references that are outside the supported referencing system (A, B, C):</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {importPending?.outOfScopeRefs.map((ref, i) => (
                    <span key={i} className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded text-xs font-mono">{ref}</span>
                  ))}
                </div>
                <p className="text-sm mt-2">These references will not be resolved and may produce incorrect results. Do you want to proceed anyway?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleImportCancel}>Cancel Import</AlertDialogCancel>
            <AlertDialogAction onClick={handleImportProceed}>Proceed Anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {}
      <Dialog open={plPickerOpen} onOpenChange={setPlPickerOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Pick from Price List</DialogTitle>
            <DialogDescription>Select an item from the price list to fill in description, unit, and cost.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 flex-wrap items-center mb-2">
            {priceListYears.length > 1 && (
              <Select value={plYearId} onValueChange={setPlYearId}>
                <SelectTrigger className="w-[120px] h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {priceListYears.map((y) => <SelectItem key={y.id} value={y.id}>{y.year}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search items..." className="pl-8 h-8 text-sm" value={plSearch} onChange={(e) => setPlSearch(e.target.value)} />
            </div>
            {plYear && (
              <Select value={plFilterCat} onValueChange={setPlFilterCat}>
                <SelectTrigger className="w-[160px] h-8 text-sm"><SelectValue placeholder="All Categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {plYear.categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="max-h-80 overflow-auto border rounded-lg">
            {priceListYears.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No price list data. Create a price list first.</div>
            ) : (
              <table className="table-grid w-full text-sm">
                <thead>
                  <tr>
                    <th className="min-w-[180px]">Description</th>
                    <th className="w-16">Unit</th>
                    <th className="w-28">Market Price</th>
                    <th className="w-28">w/ Mark-up</th>
                    <th className="w-28">Total</th>
                    <th className="w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredPlItems().map((item) => (
                    <tr key={item.id} className="cursor-pointer hover:bg-accent/30" onClick={() => handlePickPlItem(item)}>
                      <td><div>{item.description || "—"}</div><SpecText spec={composeSpec(item.extraDesc1, item.extraDesc2)} size="xs" /></td>
                      <td>{item.unit}</td>
                      <td className="text-right">₱{formatCurrency(item.marketPrice)}</td>
                      <td className="text-right">₱{formatCurrency(item.markupPrice)}</td>
                      <td className="text-right">₱{formatCurrency(item.marketPrice * item.markupPrice)}</td>
                      <td><Button variant="ghost" size="sm" className="h-6 text-xs">Use</Button></td>
                    </tr>
                  ))}
                  {getFilteredPlItems().length === 0 && (
                    <tr><td colSpan={6} className="text-center py-4 text-muted-foreground">No items found.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlPickerOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UpdatePricelistDialog
        templates={updatePriceTargets}
        open={!!updatePriceTargets && updatePriceTargets.length > 0}
        onOpenChange={(o) => { if (!o) setUpdatePriceTargets(null); }}
        onUpdated={refresh}
        defaultYearId={project?.activePriceListYearId}
      />
    </div>
  );
}

function GeneralTemplatesSection({ compact, project }: { compact: boolean; project?: Project }) {
  const [templates, setTemplates] = useState<GeneralCategoryTemplate[]>(() => getGeneralTemplates());
  const [dupaTemplates] = useState<DUPATemplate[]>(() => getTemplates());
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<GeneralCategoryTemplate | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewTemplate, setViewTemplate] = useState<GeneralCategoryTemplate | null>(null);

  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formItems, setFormItems] = useState<GeneralCategoryTemplateItem[]>([]);
  const [initialSnapshot, setInitialSnapshot] = useState<string>("");
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

  const isDirty = () => createOpen && JSON.stringify({ formName, formDesc, formItems }) !== initialSnapshot;
  const handleCreateOpenChange = (open: boolean) => {
    if (!open && isDirty()) { setConfirmCloseOpen(true); return; }
    setCreateOpen(open);
  };

  const refresh = () => setTemplates(getGeneralTemplates());

  const [sortKey, setSortKey] = useState<SortKey>("name-asc");
  const [viewSize, setViewSize] = useState<ViewSize>("md");

  const filtered = sortTemplates(
    templates.filter((t) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    }),
    sortKey,
  );

  const openCreate = () => {
    const items = [{ description: "", unit: "" }];
    setFormName(""); setFormDesc("");
    setFormItems(items);
    setInitialSnapshot(JSON.stringify({ formName: "", formDesc: "", formItems: items }));
    setCreateOpen(true); setEditTemplate(null);
    setDupaPickerOpen(false);
  };

  // DUPA template picker state
  const [dupaPickerOpen, setDupaPickerOpen] = useState(false);
  const [dupaPickerIndex, setDupaPickerIndex] = useState<number | null>(null);
  const [dupaPickerSearch, setDupaPickerSearch] = useState("");

  const openDupaPicker = (index: number) => {
    setDupaPickerIndex(index);
    setDupaPickerSearch("");
    setDupaPickerOpen(true);
  };

  const handlePickDupaTemplate = (dt: DUPATemplate) => {
    if (dupaPickerIndex === null) return;
    setFormItems(formItems.map((item, i) => i === dupaPickerIndex ? { ...item, description: dt.description, unit: dt.unit, dupaTemplateId: dt.id } : item));
    setDupaPickerOpen(false);
    setDupaPickerIndex(null);
  };

  const openEdit = (t: GeneralCategoryTemplate) => {
    const items = [...t.items];
    setFormName(t.name); setFormDesc(t.description);
    setFormItems(items);
    setInitialSnapshot(JSON.stringify({ formName: t.name, formDesc: t.description, formItems: items }));
    setEditTemplate(t); setCreateOpen(true);
  };

  const handleSave = () => {
    const template: GeneralCategoryTemplate = {
      id: editTemplate?.id || crypto.randomUUID(),
      name: formName.trim() || "Untitled Category Template",
      description: formDesc,
      items: formItems.filter((item) => item.description.trim()),
      createdAt: editTemplate?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveGeneralTemplate(template); refresh(); setCreateOpen(false);
    toast({ title: editTemplate ? "Category template updated" : "Category template created" });
  };

  const handleDelete = () => {
    if (deleteId) { deleteGeneralTemplate(deleteId); refresh(); setDeleteId(null); toast({ title: "Category template deleted" }); }
  };

  const updateItem = (i: number, field: keyof GeneralCategoryTemplateItem, value: string) => {
    setFormItems(formItems.map((item, j) => j === i ? { ...item, [field]: value } : item));
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search category templates..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button size="sm" variant="outline" onClick={() => {
          const currentDupa = getTemplates();
          const samples = createSampleGeneralTemplates(currentDupa);
          const existing = getGeneralTemplates();
          const newOnes = samples.filter(s => !existing.some(e => e.name === s.name));
          if (newOnes.length === 0) { toast({ title: "All sample category templates already exist" }); return; }
          saveGeneralTemplates([...existing, ...newOnes]);
          refresh();
          toast({ title: `Loaded ${newOnes.length} sample category templates` });
        }}>
          <FolderOpen className="h-4 w-4 mr-1" /> Load Samples
        </Button>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Category Template</Button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{filtered.length} {filtered.length === 1 ? "template" : "templates"}</p>
        <ListControls sort={sortKey} onSortChange={setSortKey} view={viewSize} onViewChange={setViewSize} />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">
          <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No category templates yet</p>
          <p className="text-sm">Save ABC categories as reusable templates with their items and linked DUPA templates.</p>
        </div>
      ) : viewSize === "xs" ? (
        <div className={VIEW_GRID_CLASS.xs}>
          {filtered.map((t) => (
            <div key={t.id} className="flex items-center gap-2 border rounded-md px-3 py-1.5 hover:border-primary/50 transition-colors">
              <FolderOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{t.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{t.description} • {t.items.length} items</p>
              </div>
              <span className="text-[10px] text-muted-foreground hidden sm:inline whitespace-nowrap">
                {new Date(t.updatedAt || t.createdAt).toLocaleDateString()}
              </span>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setViewTemplate(t)}>View</Button>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => openEdit(t)}>Edit</Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setDeleteId(t.id)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className={VIEW_GRID_CLASS[viewSize]}>
          {filtered.map((t) => {
            const isSmall = viewSize === "sm";
            const isLarge = viewSize === "lg";
            return (
              <div key={t.id} className={`border rounded-lg hover:border-primary/50 transition-colors ${isSmall ? "p-2.5" : isLarge ? "p-5" : "p-4"}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0">
                    <h3 className={`font-semibold ${isSmall ? "text-xs" : "text-sm"} truncate`}>{t.name}</h3>
                    <p className={`${isSmall ? "text-[10px]" : "text-xs"} text-muted-foreground ${isSmall ? "truncate" : ""}`}>{t.description}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setDeleteId(t.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
                {!isSmall && (
                  <div className="text-xs text-muted-foreground space-y-0.5 mb-3">
                    <p>{t.items.length} items</p>
                    {isLarge && (
                      <p>Modified: {new Date(t.updatedAt || t.createdAt).toLocaleString()}</p>
                    )}
                    {t.items.some(item => item.dupaTemplateId) && <p className="text-primary/70">🔗 Has linked DUPA templates</p>}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-xs h-7 flex-1" onClick={() => setViewTemplate(t)}><BookOpen className="h-3 w-3 mr-1" /> View</Button>
                  <Button size="sm" variant="outline" className="text-xs h-7 flex-1" onClick={() => openEdit(t)}>Edit</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {}
      <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTemplate ? "Edit Category Template" : "Create Category Template"}</DialogTitle>
            <DialogDescription>Define a reusable ABC category with its items. Optionally link DUPA templates to each item.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Template Name</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., Structural Works" className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Category description" className="mt-1" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold">Items</Label>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                    const newIdx = formItems.length;
                    setFormItems([...formItems, { description: "", unit: "" }]);
                    setTimeout(() => openDupaPicker(newIdx), 50);
                  }}>
                    <Package className="h-3 w-3 mr-1" /> From DUPA Template
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setFormItems([...formItems, { description: "", unit: "" }])}>
                    <Plus className="h-3 w-3 mr-1" /> Add Item
                  </Button>
                </div>
              </div>
              <table className="table-grid w-full text-xs table-fixed">
                <colgroup>
                  <col /><col style={{ width: "9rem" }} /><col style={{ width: "12rem" }} /><col style={{ width: "4rem" }} />
                </colgroup>
                <thead><tr><th>Description</th><th>Unit</th><th>DUPA Template</th><th></th></tr></thead>
                <tbody>
                  {formItems.map((item, i) => (
                    <tr key={i}>
                      <td className="p-1 align-top"><AutoTextarea value={item.description} onChange={(v) => updateItem(i, "description", v)} placeholder="Item description" /></td>
                      <td className="p-1 align-top"><UnitCombobox size="sm" value={item.unit} onChange={(v) => updateItem(i, "unit", v)} /></td>
                      <td className="p-1 align-top">
                        <DupaTemplatePicker
                          templates={dupaTemplates}
                          value={item.dupaTemplateId || ""}
                          onChange={(v) => updateItem(i, "dupaTemplateId", v)}
                        />
                      </td>
                      <td className="p-1 whitespace-nowrap">
                        <Button variant="ghost" size="icon" className="h-6 w-6" title="Pick from DUPA Template" onClick={() => openDupaPicker(i)}><Package className="h-3 w-3 text-primary" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFormItems(formItems.filter((_, j) => j !== i))}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {formItems.length === 0 && (
                    <tr><td colSpan={4} className="text-center text-muted-foreground py-2">No items</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleCreateOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formName.trim()}>{editTemplate ? "Update" : "Create"} Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={!!viewTemplate} onOpenChange={() => setViewTemplate(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewTemplate?.name}</DialogTitle>
            <DialogDescription>{viewTemplate?.description}</DialogDescription>
          </DialogHeader>
          {viewTemplate && (
            <div className="space-y-3 text-sm">
              <table className="table-grid w-full text-xs table-fixed">
                <colgroup>
                  <col />
                  <col style={{ width: "5rem" }} />
                  <col style={{ width: "14rem" }} />
                </colgroup>
                <thead><tr><th>Description</th><th>Unit</th><th>DUPA Template</th></tr></thead>
                <tbody>
                  {viewTemplate.items.map((item, i) => {
                    const linked = item.dupaTemplateId ? dupaTemplates.find(d => d.id === item.dupaTemplateId) : null;
                    return (
                      <tr key={i} className="align-top">
                        <td className="whitespace-normal break-words">{item.description || "—"}</td>
                        <td className="whitespace-normal break-words">{item.unit || "—"}</td>
                        <td className="whitespace-normal break-words">
                          {linked ? (
                            <span className="inline-flex items-start gap-1 rounded-md bg-primary/10 text-primary px-1.5 py-0.5 leading-snug">
                              <Package className="h-3 w-3 mt-0.5 shrink-0" />
                              <span className="break-words">{linked.name}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {viewTemplate.items.length === 0 && (
                    <tr><td colSpan={3} className="text-center text-muted-foreground py-3">No items</td></tr>
                  )}
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground">
                Created: {new Date(viewTemplate.createdAt).toLocaleDateString()}
                {viewTemplate.updatedAt && ` • Modified: ${new Date(viewTemplate.updatedAt).toLocaleDateString()}`}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save changes?</AlertDialogTitle>
            <AlertDialogDescription>You have unsaved changes to this category template. Do you want to save them before closing?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setConfirmCloseOpen(false)}>Keep Editing</Button>
            <Button variant="destructive" onClick={() => { setConfirmCloseOpen(false); setCreateOpen(false); }}>Discard</Button>
            <Button onClick={() => { setConfirmCloseOpen(false); if (formName.trim()) handleSave(); }} disabled={!formName.trim()}>Save</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Category Template?</AlertDialogTitle><AlertDialogDescription>This template will be permanently deleted.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {}
      <Dialog open={dupaPickerOpen} onOpenChange={setDupaPickerOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Pick DUPA Template</DialogTitle>
            <DialogDescription>Choose a DUPA template to link to this item. Description and unit will be auto-filled.</DialogDescription>
          </DialogHeader>
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search DUPA templates..." className="pl-8" value={dupaPickerSearch} onChange={(e) => setDupaPickerSearch(e.target.value)} />
          </div>
          <div className="max-h-64 overflow-auto space-y-2">
            {dupaTemplates
              .filter((dt) => !dupaPickerSearch.trim() || dt.name.toLowerCase().includes(dupaPickerSearch.toLowerCase()) || dt.description.toLowerCase().includes(dupaPickerSearch.toLowerCase()))
              .map((dt) => (
                <div key={dt.id} className="flex items-center justify-between p-3 rounded-md border hover:border-primary/50 cursor-pointer" onClick={() => handlePickDupaTemplate(dt)}>
                  <div>
                    <p className="font-medium text-sm">{dt.name}</p>
                    <p className="text-xs text-muted-foreground">{dt.description} — {dt.unit}</p>
                    <p className="text-xs text-muted-foreground">{dt.materials.length} mat • {dt.labor.length} labor • {dt.equipment.length} equip</p>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs h-7">Use</Button>
                </div>
              ))}
            {dupaTemplates.length === 0 && (
              <p className="text-center text-muted-foreground py-4 text-sm">No DUPA templates available. Create one in the DUPA Templates tab first.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDupaPickerOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ChevronsUpDown, X as XIcon, Check } from "lucide-react";

function DupaTemplatePicker({
  templates, value, onChange,
}: { templates: DUPATemplate[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = templates.find((t) => t.id === value);
  const filtered = search.trim()
    ? templates.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.description || "").toLowerCase().includes(search.toLowerCase())
      )
    : templates;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className="w-full justify-between font-normal h-auto min-h-7 px-2 py-1 text-xs text-left"
        >
          <span className={`truncate ${!selected ? "text-muted-foreground italic" : ""}`}>
            {selected ? selected.name : "None"}
          </span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[260px] p-0"
        align="start"
        side="bottom"
        sideOffset={4}
        avoidCollisions
        collisionPadding={8}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <div className="p-2 border-b">
          <Input
            autoFocus
            placeholder="Search DUPA templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div className="max-h-60 overflow-y-auto py-1">
          <button
            type="button"
            onClick={() => { onChange(""); setSearch(""); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs bg-popover border-b border-border/60 hover:bg-accent text-muted-foreground"
          >
            <XIcon className="h-3 w-3" />
            <span>None</span>
          </button>
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">No templates found.</div>
          )}
          {filtered.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { onChange(t.id); setSearch(""); setOpen(false); }}
              className={`w-full flex items-start gap-2 px-3 py-1.5 text-xs text-left bg-popover border-b border-border/60 last:border-b-0 hover:bg-accent ${value === t.id ? "bg-accent/70" : ""}`}
            >
              <Check className={`h-3 w-3 mt-0.5 shrink-0 ${value === t.id ? "opacity-100" : "opacity-0"}`} />
              <span className="break-words">{t.name}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============ Shared Helpers ============
function calcTemplatePreviewSummary(
  qty: number,
  resolved: ReturnType<typeof resolveDupaFormulaSections>,
  indirectPercent: number,
  vatPercent: number,
) {
  const totalMaterials = resolved.materials.reduce((sum, item) => sum + item.total, 0);
  const totalLabor = resolved.labor.reduce((sum, item) => sum + item.total, 0);
  const totalEquipment = resolved.equipment.reduce((sum, item) => sum + item.total, 0);
  const totalDirectCost = totalMaterials + totalLabor + totalEquipment;
  const indirectCost = totalDirectCost * (indirectPercent / 100);
  const totalDirectAndIndirect = totalDirectCost + indirectCost;
  const vat = totalDirectAndIndirect * (vatPercent / 100);
  const totalPrice = totalDirectAndIndirect + vat;
  const unitPrice = qty > 0 ? totalPrice / qty : 0;

  return {
    totalMaterials,
    totalLabor,
    totalEquipment,
    totalDirectCost,
    indirectCost,
    totalDirectAndIndirect,
    vat,
    totalPrice,
    unitPrice,
  };
}

/**
 * Auto-resizing single-row textarea for description cells. Wraps long text
 * onto multiple lines instead of overflowing horizontally.
 */
function AutoTextarea({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };
  if (typeof window !== "undefined") {
    setTimeout(resize, 0);
  }
  return (
    <textarea
      ref={ref}
      rows={1}
      placeholder={placeholder}
      value={value}
      onChange={(e) => { onChange(e.target.value); resize(); }}
      onFocus={resize}
      className={`flex w-full rounded-md border border-input bg-background px-2 py-1 text-xs leading-snug ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none overflow-hidden break-words whitespace-pre-wrap ${className || ""}`}
    />
  );
}

const TEMPLATE_COL_WIDTHS: Record<number, string[]> = {
  
  7: ["3rem", "minmax(17rem, 1fr)", "9rem", "7rem", "10rem", "8rem", "4.5rem"],
  
  6: ["3rem", "minmax(17rem, 1fr)", "9rem", "10rem", "8rem", "4.5rem"],
};

function FxValueCell({ value, formula, prefix }: { value: number; formula?: string; prefix?: string }) {
  const [open, setOpen] = useState(false);
  const has = !!(formula && formula.trim());
  return (
    <div className="inline-flex max-w-full flex-col items-end gap-0.5">
      <div className="inline-flex items-center gap-1">
        <span>{prefix}{formatCurrency(value)}</span>
        {has && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            title={open ? "Hide formula" : `= ${formula}`}
            className={`h-4 w-4 inline-flex items-center justify-center rounded text-[9px] font-mono transition-colors ${open ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary hover:bg-primary/25"}`}
          >
            fx
          </button>
        )}
      </div>
      {has && open && (
        <span className="max-w-[13rem] text-[10px] text-muted-foreground break-words text-right"><span className="text-muted-foreground">= </span><ColorizedFormulaText value={formula!} /></span>
      )}
    </div>
  );
}

function TemplateSection<T extends { id: string }>({
  title, items, subtotal, onAdd, onRemove, renderRow, headers, onPickFromPriceList,
}: {
  title: string; items: T[]; subtotal: number; onAdd: () => void; onRemove: (id: string) => void;
  renderRow: (item: T, index: number) => React.ReactNode; headers: string[];
  onPickFromPriceList?: (index: number) => void;
}) {
  const widths = TEMPLATE_COL_WIDTHS[headers.length] || [];
  return (
    <div className="[&+&]:mt-4">
      <div className="flex items-center justify-between mb-1">
        <h4 className="font-semibold text-xs">{title}</h4>
        <div className="flex gap-1">
          <span className="text-muted-foreground text-xs mr-1 self-center">Subtotal: ₱{formatCurrency(subtotal)}</span>
          {onPickFromPriceList && (
            <Button size="sm" variant="outline" onClick={() => { onAdd(); setTimeout(() => onPickFromPriceList(items.length), 50); }} className="h-7 text-xs">
              <ShoppingCart className="h-3 w-3 mr-1" /> From Price List
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onAdd} className="h-7 text-xs"><Plus className="h-3 w-3 mr-1" /> Add</Button>
        </div>
      </div>
      <div className="overflow-x-auto overscroll-x-contain rounded-md border border-border bg-card/30">
        <table className="table-grid w-full text-xs table-fixed border-0">
          {widths.length > 0 && (
            <colgroup>{widths.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
          )}
          <thead><tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
          <tbody>
            {items.map((item, i) => renderRow(item, i))}
            {items.length === 0 && (<tr><td colSpan={headers.length} className="text-center text-muted-foreground py-3">No items yet — click <span className="font-medium">Add</span> to start.</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TemplateSummaryRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-muted-foreground ${bold ? "font-semibold text-foreground" : ""}`}>{label}</span>
      <span className={bold ? "font-bold text-base" : "font-medium"}>₱{formatCurrency(value)}</span>
    </div>
  );
}

function TemplateSummaryCard({
  ocmPercent,
  profitPercent,
  vatPercent,
  summary,
}: {
  ocmPercent: number;
  profitPercent: number;
  vatPercent: number;
  summary: ReturnType<typeof calcTemplatePreviewSummary>;
}) {
  return (
    <div className="border rounded-lg p-2 text-xs bg-muted/30 space-y-1 text-sm">
      <TemplateSummaryRow label="(a) Total Materials" value={summary.totalMaterials} />
      <TemplateSummaryRow label="(b) Total Labor" value={summary.totalLabor} />
      <TemplateSummaryRow label="(c) Total Equipment" value={summary.totalEquipment} />
      <div className="border-t my-2" />
      <TemplateSummaryRow label="(d) Total Direct Cost (a+b+c)" value={summary.totalDirectCost} bold />
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground flex items-center gap-1 flex-wrap">
          (e) Indirect Cost — OCM {formatCurrency(ocmPercent)}% + Markup {formatCurrency(profitPercent)}% =
          <span className="font-medium text-foreground"> {formatCurrency(ocmPercent + profitPercent)}%</span>
        </span>
        <span className="font-medium ml-auto">₱{formatCurrency(summary.indirectCost)}</span>
      </div>
      <TemplateSummaryRow label="(f) Total Direct + Indirect" value={summary.totalDirectAndIndirect} />
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground flex items-center gap-1">(g) VAT {formatCurrency(vatPercent)}%</span>
        <span className="font-medium ml-auto">₱{formatCurrency(summary.vat)}</span>
      </div>
      <div className="border-t my-2" />
      <TemplateSummaryRow label="(h) Total Price" value={summary.totalPrice} bold />
    </div>
  );
}

function TemplateReadOnlySummaryCard({
  indirectPercent,
  vatPercent,
  summary,
}: {
  indirectPercent: number;
  vatPercent: number;
  summary: ReturnType<typeof calcTemplatePreviewSummary>;
}) {
  return (
    <div className="border rounded-lg p-3 bg-muted/30 space-y-1 text-sm">
      <TemplateSummaryRow label="(a) Total Materials" value={summary.totalMaterials} />
      <TemplateSummaryRow label="(b) Total Labor" value={summary.totalLabor} />
      <TemplateSummaryRow label="(c) Total Equipment" value={summary.totalEquipment} />
      <div className="border-t my-2" />
      <TemplateSummaryRow label="(d) Total Direct Cost (a+b+c)" value={summary.totalDirectCost} bold />
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">(e) Indirect Cost ({formatCurrency(indirectPercent)}%)</span>
        <span className="font-medium">₱{formatCurrency(summary.indirectCost)}</span>
      </div>
      <TemplateSummaryRow label="(f) Total Direct + Indirect" value={summary.totalDirectAndIndirect} />
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">(g) VAT ({formatCurrency(vatPercent)}%)</span>
        <span className="font-medium">₱{formatCurrency(summary.vat)}</span>
      </div>
      <div className="border-t my-2" />
      <TemplateSummaryRow label="(h) Total Price" value={summary.totalPrice} bold />
    </div>
  );
}

function TemplateViewSection({ title, subtotal, children }: { title: string; subtotal: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-sm">{title}</h4>
        <span className="text-xs text-muted-foreground">Subtotal: ₱{formatCurrency(subtotal)}</span>
      </div>
      <div className="rounded-md border border-border bg-card/30">
        {children}
      </div>
    </div>
  );
}
