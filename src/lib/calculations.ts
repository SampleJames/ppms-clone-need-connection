import { ABCItem, DUPAItem, MaterialItem, LaborItem, EquipmentItem } from "@/types";
import { evalFormula, FormulaContext } from "@/lib/formulas";

function r2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface ResolvedFormulaSections {
  refs: Record<string, number>;
  materials: Array<{ quantity: number; unitCost: number; total: number }>;
  labor: Array<{ manDays: number; wageRate: number; total: number }>;
  equipment: Array<{ period: number; rate: number; total: number }>;
}

export function resolveDupaFormulaSections(
  qty: number,
  materialsInput: MaterialItem[],
  laborInput: LaborItem[],
  equipmentInput: EquipmentItem[],
): ResolvedFormulaSections {
  const refs: Record<string, number> = {};

  materialsInput.forEach((m, i) => {
    refs[`A${i + 1}`] = m.quantity;
    refs[`A${i + 1}.u`] = m.unitCost;
    refs[`A${i + 1}.t`] = r2(m.quantity * m.unitCost);
  });
  laborInput.forEach((l, i) => {
    refs[`B${i + 1}`] = l.manDays;
    refs[`B${i + 1}.w`] = l.wageRate;
    refs[`B${i + 1}.t`] = r2(l.manDays * l.wageRate);
  });
  equipmentInput.forEach((e, i) => {
    refs[`C${i + 1}`] = e.period;
    refs[`C${i + 1}.r`] = e.rate;
    refs[`C${i + 1}.t`] = r2(e.period * e.rate);
  });

  const materials = materialsInput.map((m, i) => {
    const ctx: FormulaContext = { qty, refs };
    const resolvedQty = m.quantityFormula ? (evalFormula(m.quantityFormula, ctx) ?? m.quantity) : m.quantity;
    const finalQty = isNaN(resolvedQty) ? m.quantity : resolvedQty;
    const resolvedUC = m.unitCostFormula ? (evalFormula(m.unitCostFormula, ctx) ?? m.unitCost) : m.unitCost;
    const finalUC = isNaN(resolvedUC) ? m.unitCost : resolvedUC;
    const total = r2(finalQty * finalUC);
    refs[`A${i + 1}`] = finalQty;
    refs[`A${i + 1}.u`] = finalUC;
    refs[`A${i + 1}.t`] = total;
    return { quantity: finalQty, unitCost: finalUC, total };
  });

  const labor = laborInput.map((l, i) => {
    const ctx: FormulaContext = { qty, refs };
    const resolvedManDays = l.manDaysFormula ? (evalFormula(l.manDaysFormula, ctx) ?? l.manDays) : l.manDays;
    const finalMD = isNaN(resolvedManDays) ? l.manDays : resolvedManDays;
    const resolvedWage = l.wageRateFormula ? (evalFormula(l.wageRateFormula, ctx) ?? l.wageRate) : l.wageRate;
    const finalW = isNaN(resolvedWage) ? l.wageRate : resolvedWage;
    const total = r2(finalMD * finalW);
    refs[`B${i + 1}`] = finalMD;
    refs[`B${i + 1}.w`] = finalW;
    refs[`B${i + 1}.t`] = total;
    return { manDays: finalMD, wageRate: finalW, total };
  });

  const equipment = equipmentInput.map((e, i) => {
    const ctx: FormulaContext = { qty, refs };
    const resolvedPeriod = e.periodFormula ? (evalFormula(e.periodFormula, ctx) ?? e.period) : e.period;
    const finalP = isNaN(resolvedPeriod) ? e.period : resolvedPeriod;
    const resolvedRate = e.rateFormula ? (evalFormula(e.rateFormula, ctx) ?? e.rate) : e.rate;
    const finalR = isNaN(resolvedRate) ? e.rate : resolvedRate;
    const total = r2(finalP * finalR);
    refs[`C${i + 1}`] = finalP;
    refs[`C${i + 1}.r`] = finalR;
    refs[`C${i + 1}.t`] = total;
    return { period: finalP, rate: finalR, total };
  });

  return { refs, materials, labor, equipment };
}

export function calcMaterialTotal(item: MaterialItem): number {
  return r2(item.quantity * item.unitCost);
}

export function calcLaborTotal(item: LaborItem): number {
  return r2(item.manDays * item.wageRate);
}

export function calcEquipmentTotal(item: EquipmentItem): number {
  return r2(item.period * item.rate);
}

export function recalcDupa(dupa: DUPAItem): DUPAItem {
  const qty = dupa.quantity;
  const resolved = resolveDupaFormulaSections(qty, dupa.materials, dupa.labor, dupa.equipment);
  const materials = dupa.materials.map((m, i) => ({
    ...m,
    quantity: resolved.materials[i].quantity,
    unitCost: resolved.materials[i].unitCost,
    totalCost: resolved.materials[i].total,
  }));
  const labor = dupa.labor.map((l, i) => ({
    ...l,
    manDays: resolved.labor[i].manDays,
    wageRate: resolved.labor[i].wageRate,
    totalCost: resolved.labor[i].total,
  }));
  const equipment = dupa.equipment.map((e, i) => ({
    ...e,
    period: resolved.equipment[i].period,
    rate: resolved.equipment[i].rate,
    totalCost: resolved.equipment[i].total,
  }));

  const totalMaterials = r2(materials.reduce((sum, m) => sum + m.totalCost, 0));
  const totalLabor = r2(labor.reduce((sum, l) => sum + l.totalCost, 0));
  const totalEquipment = r2(equipment.reduce((sum, e) => sum + e.totalCost, 0));
  const totalDirectCost = r2(totalMaterials + totalLabor + totalEquipment);
  
  
  const hasSplit = dupa.ocmPercent !== undefined || dupa.profitPercent !== undefined;
  const ocmPct = dupa.ocmPercent ?? 0;
  const profitPct = dupa.profitPercent ?? 0;
  const indirectCostPercent = hasSplit ? r2(ocmPct + profitPct) : dupa.indirectCostPercent;
  const indirectCost = r2(totalDirectCost * (indirectCostPercent / 100));
  const totalDirectAndIndirect = r2(totalDirectCost + indirectCost);
  const vat = r2(totalDirectAndIndirect * (dupa.vatPercent / 100));
  const totalPrice = r2(totalDirectAndIndirect + vat);
  const unitPrice = dupa.quantity > 0 ? r2(totalPrice / dupa.quantity) : 0;

  return {
    ...dupa,
    materials,
    labor,
    equipment,
    totalMaterials,
    totalLabor,
    totalEquipment,
    totalDirectCost,
    ocmPercent: ocmPct,
    profitPercent: profitPct,
    indirectCostPercent,
    indirectCost,
    totalDirectAndIndirect,
    vat,
    totalPrice,
    unitPrice,
  };
}

export function recalcABCItem(item: ABCItem): ABCItem {
  if (item.isCategory) return item;
  const estimatedDirectCost = r2(item.materialsCost + item.laborEquipmentCost);
  const totalMarkupPercent = r2(item.ocmPercent + item.profitPercent);
  const markupValue = r2(estimatedDirectCost * (totalMarkupPercent / 100));
  const vatCost = r2((estimatedDirectCost + markupValue) * (item.vatPercent / 100));
  const totalIndirectCost = r2(markupValue + vatCost);
  
  const unitCost = r2(estimatedDirectCost + totalIndirectCost);
  const totalCost = r2(unitCost * item.quantity);
  return { ...item, estimatedDirectCost, totalMarkupPercent, markupValue, vatCost, totalIndirectCost, totalCost, unitCost };
}

export function syncDupaToABC(abcItems: ABCItem[], dupaItems: DUPAItem[]): ABCItem[] {
  return abcItems.map((abc) => {
    const dupa = dupaItems.find((d) => d.abcItemId === abc.id);
    if (!dupa || abc.isCategory) return abc;
    const updated = {
      ...abc,
      description: dupa.description,
      quantity: dupa.quantity,
      unit: dupa.unit,
      materialsCost: dupa.quantity ? r2(dupa.totalMaterials / dupa.quantity) : dupa.totalMaterials,
      laborEquipmentCost: dupa.quantity ? r2((dupa.totalLabor + dupa.totalEquipment) / dupa.quantity) : r2(dupa.totalLabor + dupa.totalEquipment),
      ocmPercent: dupa.ocmPercent ?? abc.ocmPercent,
      profitPercent: dupa.profitPercent ?? abc.profitPercent,
      vatPercent: dupa.vatPercent ?? abc.vatPercent,
      hasDupa: true,
    };
    return recalcABCItem(updated);
  });
}

export function formatCurrency(value: number): string {
  return value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
