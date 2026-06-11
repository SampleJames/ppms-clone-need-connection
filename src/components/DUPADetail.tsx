import { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from "react";
import { Plus, Trash2, Search, BookOpen, Save, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DUPAItem, MaterialItem, LaborItem, EquipmentItem, PriceListYear, PriceListItem, PriceListCategory, DUPATemplate, Project } from "@/types";
import { recalcDupa, formatCurrency } from "@/lib/calculations";
import { getTemplates, dupaToTemplate, saveTemplate, templateToDupa } from "@/lib/templates";
import { FormulaContext } from "@/lib/formulas";
import { FormulaCell, PickCell, EditableInput, useFormulaPicker, buildFormulaCtx } from "@/components/formula-cell";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

import { loadPriceList } from "@/components/PriceList";
import { NumberField } from "@/components/ui/number-field";
import { UnitCombobox } from "@/components/ui/unit-combobox";
import { SpecText, composeSpec } from "@/components/ui/spec-badge";

interface Props {
  dupa: DUPAItem;
  onUpdate: (d: DUPAItem) => void;
  compact?: boolean;
  proMode?: boolean;
  project?: Project;
}

export default function DUPADetail({ dupa, onUpdate, compact = false, proMode = false, project }: Props) {
  const [deleteTarget, setDeleteTarget] = useState<{ type: "material" | "labor" | "equipment"; id: string } | null>(null);

  const formulaCtx: FormulaContext = buildFormulaCtx(dupa.quantity, dupa.materials, dupa.labor, dupa.equipment);
  const picker = useFormulaPicker(formulaCtx);

  
  type PickerTarget = { type: "material" | "labor" | "equipment"; id: string };
  const [pricePickerOpen, setPricePickerOpen] = useState(false);
  const [pricePickerTarget, setPricePickerTarget] = useState<PickerTarget | null>(null);
  const [plSearch, setPlSearch] = useState("");
  const [plFilterCat, setPlFilterCat] = useState("all");
  const [plYearId, setPlYearId] = useState("");

  // Save to price list state
  type SaveSource =
    | { type: "material"; item: MaterialItem }
    | { type: "labor"; item: LaborItem }
    | { type: "equipment"; item: EquipmentItem };
  const [saveToPlOpen, setSaveToPlOpen] = useState(false);
  const [savePlSource, setSavePlSource] = useState<SaveSource | null>(null);
  const [savePlExtraDesc1, setSavePlExtraDesc1] = useState("");
  const [savePlExtraDesc2, setSavePlExtraDesc2] = useState("");
  const [savePlMarkupPrice, setSavePlMarkupPrice] = useState(0);
  const [savePlUnit, setSavePlUnit] = useState("");
  const [savePlCategoryId, setSavePlCategoryId] = useState("");
  const [savePlYearId, setSavePlYearId] = useState("");

  // Template state
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [applyTemplateOpen, setApplyTemplateOpen] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");

  const save = (partial: Partial<DUPAItem>) => {
    onUpdate(recalcDupa({ ...dupa, ...partial }));
  };

  const addMaterial = () => {
    const item: MaterialItem = { id: crypto.randomUUID(), description: "", quantity: 1, unit: "", unitCost: 0, totalCost: 0 };
    save({ materials: [...dupa.materials, item] });
  };

  const updateMaterial = (id: string, field: keyof MaterialItem, value: string | number) => {
    save({
      materials: dupa.materials.map((m) =>
        m.id === id ? { ...m, [field]: (field === "quantity" || field === "unitCost") ? (parseFloat(value as string) || 0) : value } : m
      ),
    });
  };

  const addLabor = () => {
    const item: LaborItem = { id: crypto.randomUUID(), description: "", manDays: 1, wageRate: 0, totalCost: 0 };
    save({ labor: [...dupa.labor, item] });
  };

  const updateLabor = (id: string, field: keyof LaborItem, value: string | number) => {
    save({
      labor: dupa.labor.map((l) =>
        l.id === id ? { ...l, [field]: (field === "manDays" || field === "wageRate") ? (parseFloat(value as string) || 0) : value } : l
      ),
    });
  };

  const addEquipment = () => {
    const item: EquipmentItem = { id: crypto.randomUUID(), description: "", period: 1, rate: 0, totalCost: 0 };
    save({ equipment: [...dupa.equipment, item] });
  };

  const updateEquipment = (id: string, field: keyof EquipmentItem, value: string | number) => {
    save({
      equipment: dupa.equipment.map((e) =>
        e.id === id ? { ...e, [field]: (field === "period" || field === "rate") ? (parseFloat(value as string) || 0) : value } : e
      ),
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "material") {
      save({ materials: dupa.materials.filter((m) => m.id !== deleteTarget.id) });
    } else if (deleteTarget.type === "labor") {
      save({ labor: dupa.labor.filter((l) => l.id !== deleteTarget.id) });
    } else {
      save({ equipment: dupa.equipment.filter((e) => e.id !== deleteTarget.id) });
    }
    setDeleteTarget(null);
  };

  
  const openPricePicker = (target: PickerTarget) => {
    const years = loadPriceList();
    setPricePickerTarget(target);
    setPlSearch("");
    setPlFilterCat("all");
    const set = project?.activePriceListYearId;
    const defaultId = set && years.find((y) => y.id === set)
      ? set
      : (years.length > 0 ? years[years.length - 1].id : "");
    setPlYearId(defaultId);
    setPricePickerOpen(true);
  };

  const handlePickPriceItem = (plItem: PriceListItem) => {
    if (!pricePickerTarget) return;
    const spec = composeSpec(plItem.extraDesc1, plItem.extraDesc2);
    const cost = plItem.marketPrice * plItem.markupPrice;
    if (pricePickerTarget.type === "material") {
      save({
        materials: dupa.materials.map((m) =>
          m.id === pricePickerTarget.id
            ? { ...m, description: plItem.description, specification: spec, unit: plItem.unit, unitCost: cost, quantity: m.quantity || 1 }
            : m
        ),
      });
    } else if (pricePickerTarget.type === "labor") {
      save({
        labor: dupa.labor.map((l) =>
          l.id === pricePickerTarget.id
            ? { ...l, description: plItem.description, specification: spec, wageRate: cost, manDays: l.manDays || 1 }
            : l
        ),
      });
    } else {
      save({
        equipment: dupa.equipment.map((e) =>
          e.id === pricePickerTarget.id
            ? { ...e, description: plItem.description, specification: spec, rate: cost, period: e.period || 1 }
            : e
        ),
      });
    }
    setPricePickerOpen(false);
    setPricePickerTarget(null);
  };

  
  
  const resolveProjectYearId = (years: PriceListYear[]): string => {
    if (years.length === 0) return "";
    const set = project?.activePriceListYearId;
    if (set && years.find((y) => y.id === set)) return set;
    return years[years.length - 1].id;
  };

  // Check if description exists in the project's active pricelist year only
  const isInPriceList = (desc: string): boolean => {
    if (!desc.trim()) return true;
    const years = loadPriceList();
    const yearId = resolveProjectYearId(years);
    const year = years.find((y) => y.id === yearId);
    if (!year) return false;
    return year.items.some((i) => i.description.toLowerCase() === desc.toLowerCase());
  };

  const openSaveToPriceList = (source: SaveSource) => {
    setSavePlSource(source);
    const desc = source.item.description;
    const spec = (source.item as any).specification || "";
    const [s1 = "", s2 = ""] = spec.split(" • ");
    setSavePlExtraDesc1(s1);
    setSavePlExtraDesc2(s2);
    if (source.type === "material") {
      setSavePlMarkupPrice(source.item.unitCost);
      setSavePlUnit(source.item.unit);
    } else if (source.type === "labor") {
      setSavePlMarkupPrice(source.item.wageRate);
      setSavePlUnit("man-day");
    } else {
      setSavePlMarkupPrice(source.item.rate);
      setSavePlUnit("day");
    }
    setSavePlCategoryId("");
    const yearsNow = loadPriceList();
    setSavePlYearId(resolveProjectYearId(yearsNow));
    void desc;
    setSaveToPlOpen(true);
  };

  const handleSaveToPriceList = () => {
    if (!savePlSource) return;
    const STORAGE_KEY = "costmgr_pricelist";
    const years: PriceListYear[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (years.length === 0) return;

    const targetYear = years.find((y) => y.id === savePlYearId) || years[years.length - 1];
    let catId = savePlCategoryId;
    if (!catId && targetYear.categories.length > 0) {
      catId = targetYear.categories[0].id;
    }
    if (!catId) return;

    const sourceCost =
      savePlSource.type === "material"
        ? savePlSource.item.unitCost
        : savePlSource.type === "labor"
        ? savePlSource.item.wageRate
        : savePlSource.item.rate;

    const newItem: PriceListItem = {
      id: crypto.randomUUID(),
      description: savePlSource.item.description,
      extraDesc1: savePlExtraDesc1,
      extraDesc2: savePlExtraDesc2,
      unit: savePlUnit,
      marketPrice: sourceCost,
      markupPrice: savePlMarkupPrice,
      categoryId: catId,
    };
    const updated = years.map((y) =>
      y.id === targetYear.id ? { ...y, items: [...y.items, newItem] } : y
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setSaveToPlOpen(false);
    setSavePlSource(null);
  };

  const priceListYears = loadPriceList();
  const plYear = priceListYears.find((y) => y.id === plYearId);

  const getFilteredPlItems = () => {
    if (!plYear) return [];
    let items = plYear.items;
    if (plFilterCat !== "all") {
      items = items.filter((i) => i.categoryId === plFilterCat);
    }
    if (plSearch.trim()) {
      const q = plSearch.toLowerCase();
      items = items.filter((i) => i.description.toLowerCase().includes(q) || i.unit.toLowerCase().includes(q));
    }
    return items;
  };

  return (
    <div className={compact ? "space-y-3 text-xs" : "space-y-6"}>
      {}
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 text-sm items-end mb-1">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Description</Label>
          <Input
            className="h-8 text-sm"
            value={dupa.description}
            onChange={(e) => save({ description: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Item No.</Label>
          <Input className="h-8 text-sm w-20" value={dupa.itemNo} disabled />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Quantity</Label>
          <NumericInput
            className="h-8 text-sm w-24"
            value={dupa.quantity}
            onNumChange={(n) => save({ quantity: n })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Unit</Label>
          <UnitCombobox
            size="sm"
            value={dupa.unit}
            onChange={(v) => save({ unit: v })}
          />
        </div>
      </div>

      {}
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-xs text-muted-foreground italic">Tip: type <kbd className="px-1 py-0.5 rounded bg-muted text-foreground">=</kbd> in any number cell to enter a formula.</span>
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={() => { setTemplateName(dupa.description); setSaveTemplateOpen(true); }} className="gap-1">
          <Save className="h-3.5 w-3.5" /> Save as Template
        </Button>
        <Button size="sm" variant="outline" onClick={() => { setTemplateSearch(""); setApplyTemplateOpen(true); }} className="gap-1">
          <Package className="h-3.5 w-3.5" /> Apply Template
        </Button>
      </div>

      {}
      <Section title="A. Materials" total={dupa.totalMaterials} onAdd={addMaterial} compact={compact}>
        <table className="table-grid w-full">
          <thead>
            <tr>
              <th className="w-12">Ref</th>
              <th className="min-w-[140px]">Description</th>
              <th className="w-10"></th>
              <th className="w-32">Qty</th>
              <th className="w-28">Unit</th>
              <th className="w-32">Unit Cost</th>
              <th className="w-28">Total</th>
              <th className="w-16"></th>
            </tr>
          </thead>
          <tbody>
            {dupa.materials.map((m, idx) => (
              <tr key={m.id}>
                <td className="px-1.5 py-1 text-center font-mono text-xs text-muted-foreground">A{idx + 1}</td>
                <td className="px-1.5 py-1 align-top"><EditableInput value={m.description} onChange={(v) => updateMaterial(m.id, "description", v)} proMode={proMode} multiline /><SpecText spec={m.specification} /></td>
                <td className="px-0.5 py-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" title="Pick from Price List" onClick={() => openPricePicker({ type: "material", id: m.id })}>
                    <BookOpen className="h-3 w-3 text-primary" />
                  </Button>
                </td>
                <FormulaCell
                  ref_={`A${idx + 1}`}
                  value={m.quantity}
                  onValueChange={(v) => updateMaterial(m.id, "quantity", v)}
                  formula={m.quantityFormula || ""}
                  onFormulaChange={(v) => updateMaterial(m.id, "quantityFormula" as any, v)}
                  proMode={proMode}
                  placeholder="qty * 0.5"
                  picker={picker}
                />
                <td className="px-1.5 py-1"><UnitCombobox size="sm" value={m.unit} onChange={(v) => updateMaterial(m.id, "unit", v)} /></td>
                <FormulaCell
                  ref_={`A${idx + 1}.u`}
                  value={m.unitCost}
                  onValueChange={(v) => updateMaterial(m.id, "unitCost", v)}
                  formula={m.unitCostFormula || ""}
                  onFormulaChange={(v) => updateMaterial(m.id, "unitCostFormula" as any, v)}
                  proMode={proMode}
                  placeholder="A1.u * 1.1"
                  picker={picker}
                />
                <PickCell ref_={`A${idx + 1}.t`} picker={picker} className="text-right font-medium">
                  <span className="text-muted-foreground/70 px-1 py-0.5 block text-right">₱{formatCurrency(m.quantity * m.unitCost)}</span>
                </PickCell>
                <td className="px-0.5 py-1 flex gap-0.5">
                  {!isInPriceList(m.description) && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" title="Save to Price List" onClick={() => openSaveToPriceList({ type: "material", item: m })}>
                      <Save className="h-3 w-3 text-amber-600" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDeleteTarget({ type: "material", id: m.id })}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </td>
              </tr>
            ))}
            {dupa.materials.length === 0 && (
              <tr><td colSpan={8} className="text-center text-muted-foreground py-3 text-xs">No materials added</td></tr>
            )}
          </tbody>
        </table>
      </Section>

      {}
      <Section title="B. Labor" total={dupa.totalLabor} onAdd={addLabor} compact={compact}>
        <table className="table-grid w-full">
          <thead>
            <tr>
              <th className="w-12">Ref</th>
              <th className="min-w-[140px]">Description</th>
              <th className="w-10"></th>
              <th className="w-32">Man-Days</th>
              <th className="w-32">Wage Rate</th>
              <th className="w-28">Total</th>
              <th className="w-16"></th>
            </tr>
          </thead>
          <tbody>
            {dupa.labor.map((l, idx) => (
              <tr key={l.id}>
                <td className="px-1.5 py-1 text-center font-mono text-xs text-muted-foreground">B{idx + 1}</td>
                <td className="px-1.5 py-1 align-top"><EditableInput value={l.description} onChange={(v) => updateLabor(l.id, "description", v)} proMode={proMode} multiline /><SpecText spec={l.specification} /></td>
                <td className="px-0.5 py-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" title="Pick from Price List" onClick={() => openPricePicker({ type: "labor", id: l.id })}>
                    <BookOpen className="h-3 w-3 text-primary" />
                  </Button>
                </td>
                <FormulaCell
                  ref_={`B${idx + 1}`}
                  value={l.manDays}
                  onValueChange={(v) => updateLabor(l.id, "manDays", v)}
                  formula={l.manDaysFormula || ""}
                  onFormulaChange={(v) => updateLabor(l.id, "manDaysFormula" as any, v)}
                  proMode={proMode}
                  placeholder="qty * 0.1"
                  picker={picker}
                />
                <FormulaCell
                  ref_={`B${idx + 1}.w`}
                  value={l.wageRate}
                  onValueChange={(v) => updateLabor(l.id, "wageRate", v)}
                  formula={l.wageRateFormula || ""}
                  onFormulaChange={(v) => updateLabor(l.id, "wageRateFormula" as any, v)}
                  proMode={proMode}
                  placeholder="500 * 1.1"
                  picker={picker}
                />
                <PickCell ref_={`B${idx + 1}.t`} picker={picker} className="text-right font-medium">
                  <span className="text-muted-foreground/70 px-1 py-0.5 block text-right">₱{formatCurrency(l.manDays * l.wageRate)}</span>
                </PickCell>
                <td className="px-0.5 py-1 flex gap-0.5">
                  {!isInPriceList(l.description) && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" title="Save to Price List" onClick={() => openSaveToPriceList({ type: "labor", item: l })}>
                      <Save className="h-3 w-3 text-amber-600" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDeleteTarget({ type: "labor", id: l.id })}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </td>
              </tr>
            ))}
            {dupa.labor.length === 0 && (
              <tr><td colSpan={7} className="text-center text-muted-foreground py-3 text-xs">No labor added</td></tr>
            )}
          </tbody>
        </table>
      </Section>

      {}
      <Section title="C. Equipment Utilization" total={dupa.totalEquipment} onAdd={addEquipment}>
        <table className="table-grid w-full">
          <thead>
            <tr>
              <th className="w-12">Ref</th>
              <th className="min-w-[140px]">Equipment</th>
              <th className="w-10"></th>
              <th className="w-32">Period</th>
              <th className="w-32">Rate</th>
              <th className="w-28">Total</th>
              <th className="w-16"></th>
            </tr>
          </thead>
          <tbody>
            {dupa.equipment.map((e, idx) => (
              <tr key={e.id}>
                <td className="px-1.5 py-1 text-center font-mono text-xs text-muted-foreground">C{idx + 1}</td>
                <td className="align-top"><EditableInput value={e.description} onChange={(v) => updateEquipment(e.id, "description", v)} proMode={proMode} multiline /><SpecText spec={e.specification} /></td>
                <td className="px-0.5 py-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" title="Pick from Price List" onClick={() => openPricePicker({ type: "equipment", id: e.id })}>
                    <BookOpen className="h-3 w-3 text-primary" />
                  </Button>
                </td>
                <FormulaCell
                  ref_={`C${idx + 1}`}
                  value={e.period}
                  onValueChange={(v) => updateEquipment(e.id, "period", v)}
                  formula={e.periodFormula || ""}
                  onFormulaChange={(v) => updateEquipment(e.id, "periodFormula" as any, v)}
                  proMode={proMode}
                  placeholder="qty * 0.05"
                  picker={picker}
                />
                <FormulaCell
                  ref_={`C${idx + 1}.r`}
                  value={e.rate}
                  onValueChange={(v) => updateEquipment(e.id, "rate", v)}
                  formula={e.rateFormula || ""}
                  onFormulaChange={(v) => updateEquipment(e.id, "rateFormula" as any, v)}
                  proMode={proMode}
                  placeholder="1000 * 1.05"
                  picker={picker}
                />
                <PickCell ref_={`C${idx + 1}.t`} picker={picker} className="text-right font-medium">
                  <span className="text-muted-foreground/70 px-1 py-0.5 block text-right">{formatCurrency(e.period * e.rate)}</span>
                </PickCell>
                <td className="px-0.5 py-1 flex gap-0.5">
                  {!isInPriceList(e.description) && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" title="Save to Price List" onClick={() => openSaveToPriceList({ type: "equipment", item: e })}>
                      <Save className="h-3 w-3 text-amber-600" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDeleteTarget({ type: "equipment", id: e.id })}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </td>
              </tr>
            ))}
            {dupa.equipment.length === 0 && (
              <tr><td colSpan={7} className="text-center text-muted-foreground py-3 text-xs">No equipment added</td></tr>
            )}
          </tbody>
        </table>
      </Section>

      {}
      <div className={`border rounded-lg ${compact ? "p-2 text-xs" : "p-4"} bg-muted/30 space-y-1 text-sm`}>
        <SummaryRow label="(a) Total Materials" value={dupa.totalMaterials} />
        <SummaryRow label="(b) Total Labor" value={dupa.totalLabor} />
        <SummaryRow label="(c) Total Equipment" value={dupa.totalEquipment} />
        <div className="border-t my-2" />
        <SummaryRow label="(d) Total Direct Cost (a+b+c)" value={dupa.totalDirectCost} bold />
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground flex items-center gap-1 flex-wrap">
            (e) Indirect Cost — OCM
            <NumericInput
              className="h-6 w-14 text-xs mx-1"
              value={dupa.ocmPercent ?? 0}
              onNumChange={(n) => save({ ocmPercent: n })}
            />
            % + Markup
            <NumericInput
              className="h-6 w-14 text-xs mx-1"
              value={dupa.profitPercent ?? 0}
              onNumChange={(n) => save({ profitPercent: n })}
            />
            % = <span className="font-medium text-foreground">{formatCurrency(dupa.indirectCostPercent)}%</span>
          </span>
          <span className="font-medium ml-auto">₱{formatCurrency(dupa.indirectCost)}</span>
        </div>
        <SummaryRow label="(f) Total Direct + Indirect" value={dupa.totalDirectAndIndirect} />
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground flex items-center gap-1">
            (g) VAT
            <NumericInput
              className="h-6 w-16 text-xs mx-1"
              value={dupa.vatPercent}
              onNumChange={(n) => save({ vatPercent: n })}
            />
            %
          </span>
          <span className="font-medium ml-auto">₱{formatCurrency(dupa.vat)}</span>
        </div>
        <div className="border-t my-2" />
        <SummaryRow label="(h) Total Price" value={dupa.totalPrice} bold />
      </div>

      {}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Row?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this {deleteTarget?.type} row. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {}
      <Dialog open={pricePickerOpen} onOpenChange={setPricePickerOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Pick from Price List</DialogTitle>
            <DialogDescription>Select an item to import its description, unit, and unit cost.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 flex-wrap items-center mb-2">
            {priceListYears.length > 0 && (
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
                    <tr key={item.id} className="cursor-pointer hover:bg-accent/30" onClick={() => handlePickPriceItem(item)}>
                      <td><div>{item.description || "—"}</div><SpecText spec={composeSpec(item.extraDesc1, item.extraDesc2)} /></td>
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
            <Button variant="outline" onClick={() => setPricePickerOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={saveToPlOpen} onOpenChange={setSaveToPlOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save to Price List</DialogTitle>
            <DialogDescription>This item isn't in the price list yet. Fill in the additional details to save it.</DialogDescription>
          </DialogHeader>
          {savePlSource && (
            <div className="space-y-3">
              <div>
                <Label className="text-sm">Description</Label>
                <Input disabled value={savePlSource.item.description} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Unit</Label>
                  <UnitCombobox value={savePlUnit} onChange={setSavePlUnit} />
                </div>
                <div>
                  <Label className="text-sm">Market Price</Label>
                  <Input
                    disabled
                    value={
                      savePlSource.type === "material"
                        ? savePlSource.item.unitCost
                        : savePlSource.type === "labor"
                        ? savePlSource.item.wageRate
                        : savePlSource.item.rate
                    }
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Specification 1</Label>
                  <Input value={savePlExtraDesc1} onChange={(e) => setSavePlExtraDesc1(e.target.value)} className="mt-1" placeholder="Optional" />
                </div>
                <div>
                  <Label className="text-sm">Specification 2</Label>
                  <Input value={savePlExtraDesc2} onChange={(e) => setSavePlExtraDesc2(e.target.value)} className="mt-1" placeholder="Optional" />
                </div>
              </div>
              <div>
                <Label className="text-sm">Price w/ Mark-up</Label>
                <NumberField value={savePlMarkupPrice} onValueChange={setSavePlMarkupPrice} className="mt-1" />
              </div>
              {(() => {
                const selectedYear = priceListYears.find((y) => y.id === savePlYearId);
                return (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm">Year</Label>
                      {priceListYears.length > 0 ? (
                        <Select
                          value={savePlYearId}
                          onValueChange={(v) => { setSavePlYearId(v); setSavePlCategoryId(""); }}
                        >
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select year" /></SelectTrigger>
                          <SelectContent>
                            {priceListYears.map((y) => (
                              <SelectItem key={y.id} value={y.id}>{y.year}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">No price list years available.</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm">Category</Label>
                      {selectedYear && selectedYear.categories.length > 0 ? (
                        <Select value={savePlCategoryId} onValueChange={setSavePlCategoryId}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                          <SelectContent>
                            {selectedYear.categories.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">No categories in this year.</p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveToPlOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveToPriceList} disabled={!savePlCategoryId}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>Save this DUPA as a reusable template with all materials, labor, equipment, and formulas.</DialogDescription>
          </DialogHeader>
          <div>
            <Label className="text-sm">Template Name</Label>
            <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="e.g., Concrete Works Class A" className="mt-1" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveTemplateOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              const tmpl = dupaToTemplate(dupa, templateName.trim() || dupa.description);
              saveTemplate(tmpl);
              setSaveTemplateOpen(false);
              toast({ title: "Template saved", description: `"${tmpl.name}" is now available in Templates.` });
            }} disabled={!templateName.trim()}>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={applyTemplateOpen} onOpenChange={setApplyTemplateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply Template</DialogTitle>
            <DialogDescription>Choose a template to apply to this DUPA. This will replace all current materials, labor, and equipment.</DialogDescription>
          </DialogHeader>
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search templates..." className="pl-8" value={templateSearch} onChange={(e) => setTemplateSearch(e.target.value)} />
          </div>
          <div className="max-h-64 overflow-auto space-y-2">
            {getTemplates()
              .filter((t) => !templateSearch.trim() || t.name.toLowerCase().includes(templateSearch.toLowerCase()) || t.description.toLowerCase().includes(templateSearch.toLowerCase()))
              .map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-md border hover:border-primary/50 cursor-pointer" onClick={() => {
                  const newDupa: DUPAItem = {
                    ...dupa,
                    description: t.description,
                    unit: t.unit,
                    materials: t.materials.map((m) => ({ ...m, id: crypto.randomUUID() })),
                    labor: t.labor.map((l) => ({ ...l, id: crypto.randomUUID() })),
                    equipment: t.equipment.map((e) => ({ ...e, id: crypto.randomUUID() })),
                    indirectCostPercent: t.indirectCostPercent,
                    vatPercent: t.vatPercent,
                  };
                  onUpdate(recalcDupa(newDupa));
                  setApplyTemplateOpen(false);
                  toast({ title: "Template applied", description: `Applied "${t.name}" to this DUPA.` });
                }}>
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.materials.length} mat • {t.labor.length} labor • {t.equipment.length} equip</p>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs h-7">Apply</Button>
                </div>
              ))}
            {getTemplates().length === 0 && (
              <p className="text-center text-muted-foreground py-4 text-sm">No templates available. Create one in the Templates tab or save a DUPA as template.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ title, total, onAdd, children, compact }: { title: string; total: number; onAdd: () => void; children: React.ReactNode; compact?: boolean }) {
  return (
    <div>
      <div className={`flex items-center justify-between ${compact ? "mb-1" : "mb-2"}`}>
        <h3 className={`font-semibold ${compact ? "text-xs" : "text-sm"}`}>{title}</h3>
        <div className={`flex items-center ${compact ? "gap-2" : "gap-3"}`}>
          <span className={`text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}>Subtotal: ₱{formatCurrency(total)}</span>
          <Button size="sm" variant="outline" onClick={onAdd} className={compact ? "h-7 text-xs px-2" : ""}>
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </div>
      </div>
      {children}
    </div>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-muted-foreground ${bold ? "font-semibold text-foreground" : ""}`}>{label}</span>
      <span className={bold ? "font-bold text-base" : "font-medium"}>₱{formatCurrency(value)}</span>
    </div>
  );
}

function NumericInput({ value, onNumChange, className, ...props }: { value: number; onNumChange: (n: number) => void; className?: string } & Omit<React.ComponentProps<"input">, "value" | "onChange" | "type">) {
  const [local, setLocal] = useState(String(value));
  const [focused, setFocused] = useState(false);

  if (!focused && String(value) !== local) setLocal(String(value));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowed = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Tab", "Home", "End", "Enter", "Escape"];
    if (allowed.includes(e.key)) return;
    if ((e.ctrlKey || e.metaKey) && ["a", "c", "v", "x", "z"].includes(e.key.toLowerCase())) return;
    if (!/^[0-9.]$/.test(e.key) && e.key !== "-") {
      e.preventDefault();
    }
  };

  return (
    <Input
      {...props}
      className={className}
      type="text"
      inputMode="decimal"
      value={focused ? local : String(value)}
      onFocus={(e) => { setFocused(true); setLocal(String(value)); setTimeout(() => e.target.select(), 0); }}
      onBlur={() => { setFocused(false); onNumChange(parseFloat(local) || 0); }}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "" || v === "-" || /^-?\d*\.?\d*$/.test(v)) {
          setLocal(v);
        }
      }}
      onKeyDown={handleKeyDown}
    />
  );
}
