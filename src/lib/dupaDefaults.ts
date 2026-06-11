import { EquipmentItem, LaborItem, MaterialItem } from "@/types";

export const DEFAULT_DUPA_ROW_COUNT = 5;

export function createDefaultMaterial(): MaterialItem {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: 1,
    unit: "",
    unitCost: 0,
    totalCost: 0,
    quantityFormula: "",
    unitCostFormula: "",
  };
}

export function createDefaultLabor(): LaborItem {
  return {
    id: crypto.randomUUID(),
    description: "",
    manDays: 1,
    wageRate: 0,
    totalCost: 0,
    manDaysFormula: "",
    wageRateFormula: "",
  };
}

export function createDefaultEquipment(): EquipmentItem {
  return {
    id: crypto.randomUUID(),
    description: "",
    period: 1,
    rate: 0,
    totalCost: 0,
    periodFormula: "",
    rateFormula: "",
  };
}

export function createDefaultMaterials(count = DEFAULT_DUPA_ROW_COUNT): MaterialItem[] {
  return Array.from({ length: count }, () => createDefaultMaterial());
}

export function createDefaultLaborRows(count = DEFAULT_DUPA_ROW_COUNT): LaborItem[] {
  return Array.from({ length: count }, () => createDefaultLabor());
}

export function createDefaultEquipmentRows(count = DEFAULT_DUPA_ROW_COUNT): EquipmentItem[] {
  return Array.from({ length: count }, () => createDefaultEquipment());
}

export function ensureMinimumDupaRows<T>(items: T[], minRows: number, factory: () => T): T[] {
  if (items.length >= minRows) return items;
  return [...items, ...Array.from({ length: minRows - items.length }, factory)];
}