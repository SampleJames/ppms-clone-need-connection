import { DUPATemplate, DUPAItem, GeneralCategoryTemplate, GeneralCategoryTemplateItem, MaterialItem, LaborItem, EquipmentItem } from "@/types";
import { createDefaultEquipmentRows, createDefaultLaborRows, createDefaultMaterials, ensureMinimumDupaRows } from "@/lib/dupaDefaults";

const TEMPLATES_KEY = "costmgr_dupa_templates";
const GENERAL_TEMPLATES_KEY = "costmgr_general_templates";

export function getTemplates(): DUPATemplate[] {
  const data = localStorage.getItem(TEMPLATES_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveTemplates(templates: DUPATemplate[]) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}

export function saveTemplate(template: DUPATemplate) {
  const templates = getTemplates();
  const idx = templates.findIndex((t) => t.id === template.id);
  if (idx >= 0) {
    templates[idx] = template;
  } else {
    templates.push(template);
  }
  saveTemplates(templates);
}

export function deleteTemplate(id: string) {
  saveTemplates(getTemplates().filter((t) => t.id !== id));
}

export function dupaToTemplate(dupa: DUPAItem, name: string): DUPATemplate {
  return {
    id: crypto.randomUUID(),
    name,
    description: dupa.description,
    unit: dupa.unit,
    quantity: dupa.quantity,
    materials: ensureMinimumDupaRows(dupa.materials.map((m) => ({ ...m, id: crypto.randomUUID() })), 5, () => createDefaultMaterials(1)[0]),
    labor: ensureMinimumDupaRows(dupa.labor.map((l) => ({ ...l, id: crypto.randomUUID() })), 5, () => createDefaultLaborRows(1)[0]),
    equipment: ensureMinimumDupaRows(dupa.equipment.map((e) => ({ ...e, id: crypto.randomUUID() })), 5, () => createDefaultEquipmentRows(1)[0]),
    indirectCostPercent: dupa.indirectCostPercent,
    vatPercent: dupa.vatPercent,
    createdAt: new Date().toISOString(),
  };
}

export function templateToDupa(
  template: DUPATemplate,
  abcItemId: string,
  itemNo: string,
  quantity: number
): DUPAItem {
  return {
    id: crypto.randomUUID(),
    abcItemId,
    itemNo,
    description: template.description,
    quantity,
    unit: template.unit,
    materials: ensureMinimumDupaRows(template.materials.map((m) => ({ ...m, id: crypto.randomUUID() })), 5, () => createDefaultMaterials(1)[0]),
    labor: ensureMinimumDupaRows(template.labor.map((l) => ({ ...l, id: crypto.randomUUID() })), 5, () => createDefaultLaborRows(1)[0]),
    equipment: ensureMinimumDupaRows(template.equipment.map((e) => ({ ...e, id: crypto.randomUUID() })), 5, () => createDefaultEquipmentRows(1)[0]),
    totalMaterials: 0,
    totalLabor: 0,
    totalEquipment: 0,
    totalDirectCost: 0,
    indirectCostPercent: template.indirectCostPercent,
    indirectCost: 0,
    totalDirectAndIndirect: 0,
    vatPercent: template.vatPercent,
    vat: 0,
    totalPrice: 0,
    unitPrice: 0,
  };
}

export function getGeneralTemplates(): GeneralCategoryTemplate[] {
  const data = localStorage.getItem(GENERAL_TEMPLATES_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveGeneralTemplates(templates: GeneralCategoryTemplate[]) {
  localStorage.setItem(GENERAL_TEMPLATES_KEY, JSON.stringify(templates));
}

export function saveGeneralTemplate(template: GeneralCategoryTemplate) {
  const templates = getGeneralTemplates();
  const idx = templates.findIndex((t) => t.id === template.id);
  if (idx >= 0) {
    templates[idx] = template;
  } else {
    templates.push(template);
  }
  saveGeneralTemplates(templates);
}

export function deleteGeneralTemplate(id: string) {
  saveGeneralTemplates(getGeneralTemplates().filter((t) => t.id !== id));
}
