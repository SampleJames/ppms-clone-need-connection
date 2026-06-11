import ExcelJS from "exceljs";
import { Project, ABCItem, DUPAItem } from "@/types";
import { recalcDupa, recalcABCItem } from "./calculations";
import { buildProjectWorkbook } from "./excel";

const PAYLOAD_SHEET = "_APP_CATEGORY";
const PAYLOAD_VERSION = 1;

interface CategoryPayload {
  v: number;
  exportedAt: string;
  sourceProject: { id: string; name: string };
  abcItems: ABCItem[];
  dupaItems: DUPAItem[];
}

function collectSubtree(all: ABCItem[], rootId: string): ABCItem[] {
  const byParent = new Map<string | null, ABCItem[]>();
  for (const it of all) {
    const k = it.parentId ?? null;
    const arr = byParent.get(k) ?? [];
    arr.push(it);
    byParent.set(k, arr);
  }
  for (const arr of byParent.values()) arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const out: ABCItem[] = [];
  const root = all.find((i) => i.id === rootId);
  if (!root) return out;
  const walk = (item: ABCItem) => {
    out.push(item);
    for (const child of byParent.get(item.id) ?? []) walk(child);
  };
  walk(root);
  return out;
}

export async function exportCategoriesToExcel(project: Project, categoryIds: string[]) {
  if (categoryIds.length === 0) return;

  
  const seen = new Set<string>();
  const collected: ABCItem[] = [];
  for (const cid of categoryIds) {
    for (const it of collectSubtree(project.abcItems, cid)) {
      if (!seen.has(it.id)) {
        seen.add(it.id);
        collected.push(it);
      }
    }
  }
  if (collected.length === 0) return;

  
  
  
  const idSet = new Set(collected.map((i) => i.id));
  const exportAbc: ABCItem[] = collected.map((i, idx) => ({
    ...i,
    parentId: i.parentId && idSet.has(i.parentId) ? i.parentId : null,
    children: (i.children ?? []).filter((cid) => idSet.has(cid)),
    order: idx,
  }));

  
  const exportDupa: DUPAItem[] = project.dupaItems.filter((d) => idSet.has(d.abcItemId));

  

  const subProject: Project = {
    ...project,
    name: `${project.name} — ${categoryIds.length === 1 ? "Category" : "Categories"} Export`,
    abcItems: exportAbc,
    dupaItems: exportDupa,
  };

  
  
  const wb = await buildProjectWorkbook(subProject);

  const payload: CategoryPayload = {
    v: PAYLOAD_VERSION,
    exportedAt: new Date().toISOString(),
    sourceProject: { id: project.id, name: project.name },
    abcItems: exportAbc,
    dupaItems: exportDupa,
  };
  const ws = wb.addWorksheet(PAYLOAD_SHEET, { state: "veryHidden" });
  ws.getCell("A1").value = "DO NOT EDIT — App category payload";
  
  const json = JSON.stringify(payload);
  const CHUNK = 30000;
  for (let i = 0, row = 2; i < json.length; i += CHUNK, row++) {
    ws.getCell(`A${row}`).value = json.substring(i, i + CHUNK);
  }

  const buf = await wb.xlsx.writeBuffer();
  const outBlob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(outBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${subProject.name}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function readPayload(file: File): Promise<CategoryPayload | null> {
  const buf = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.getWorksheet(PAYLOAD_SHEET);
  if (!ws) return null;
  let json = "";
  let row = 2;
  while (true) {
    const v = ws.getCell(`A${row}`).value;
    if (v == null || v === "") break;
    json += String(v);
    row++;
    if (row > 100000) break; // safety
  }
  if (!json) return null;
  try {
    const p = JSON.parse(json) as CategoryPayload;
    if (!p || p.v !== PAYLOAD_VERSION || !Array.isArray(p.abcItems)) return null;
    return p;
  } catch {
    return null;
  }
}

/**
 * Merge an imported category (with descendants + DUPAs) into an existing project.
 *
 * Reliability rules:
 * - Regenerate ALL ids (ABC + DUPA + materials/labor/equipment) so we never
 *   collide with existing items.
 * - Auto-suffix conflicting `itemNo` values ("3.1" → "3.1 (2)") so the tree
 *   stays unambiguous.
 * - Imported root categories are appended at the end of the top-level list.
 * - hasDupa flags + parent/children references are recomputed.
 * - Each DUPA & ABC item is run through the standard recalc functions.
 */
export function mergeImportedCategories(
  project: Project,
  imported: { abcItems: ABCItem[]; dupaItems: DUPAItem[] },
): Project {
  const idMap = new Map<string, string>(); 
  const newItemNoById = new Map<string, string>(); 

  
  for (const it of imported.abcItems) {
    idMap.set(it.id, crypto.randomUUID());
  }

  
  
  
  const existingItemNos = new Set(project.abcItems.map((i) => i.itemNo));
  let nextTopLevel = 1;
  for (const it of project.abcItems) {
    if (it.parentId == null) {
      const n = parseInt(it.itemNo, 10);
      if (!isNaN(n) && String(n) === it.itemNo.trim() && n >= nextTopLevel) {
        nextTopLevel = n + 1;
      }
    }
  }
  const allocTopLevel = (): string => {
    while (existingItemNos.has(String(nextTopLevel))) nextTopLevel++;
    const v = String(nextTopLevel++);
    existingItemNos.add(v);
    return v;
  };

  
  
  
  const childCounter = new Map<string, number>(); 
  for (const it of imported.abcItems) {
    const newId = idMap.get(it.id)!;
    let newItemNo: string;
    if (!it.parentId || !idMap.has(it.parentId)) {
      
      newItemNo = allocTopLevel();
    } else {
      const newParentId = idMap.get(it.parentId)!;
      const parentItemNo = newItemNoById.get(newParentId) ?? "?";
      const idx = (childCounter.get(newParentId) ?? 0) + 1;
      childCounter.set(newParentId, idx);
      newItemNo = `${parentItemNo}.${idx}`;
      existingItemNos.add(newItemNo);
    }
    newItemNoById.set(newId, newItemNo);
  }

  const baseOrder = project.abcItems.length;
  const newAbc: ABCItem[] = imported.abcItems.map((it, idx) => {
    const newId = idMap.get(it.id)!;
    const newParent = it.parentId ? (idMap.get(it.parentId) ?? null) : null;
    const newChildren = (it.children ?? []).map((c) => idMap.get(c)).filter((x): x is string => !!x);
    const remapped: ABCItem = {
      ...it,
      id: newId,
      itemNo: newItemNoById.get(newId) ?? it.itemNo,
      parentId: newParent,
      children: newChildren,
      order: baseOrder + idx,
      hasDupa: false, 
    };
    return it.isCategory ? remapped : recalcABCItem(remapped);
  });

  
  const newDupa: DUPAItem[] = [];
  for (const d of imported.dupaItems) {
    const newAbcId = idMap.get(d.abcItemId);
    if (!newAbcId) continue; 
    const target = newAbc.find((a) => a.id === newAbcId);
    if (!target) continue;
    target.hasDupa = true;
    const fresh: DUPAItem = {
      ...d,
      id: crypto.randomUUID(),
      abcItemId: newAbcId,
      itemNo: target.itemNo,
      materials: d.materials.map((m) => ({ ...m, id: crypto.randomUUID() })),
      labor: d.labor.map((l) => ({ ...l, id: crypto.randomUUID() })),
      equipment: d.equipment.map((e) => ({ ...e, id: crypto.randomUUID() })),
    };
    newDupa.push(recalcDupa(fresh));
  }

  return {
    ...project,
    abcItems: [...project.abcItems, ...newAbc],
    dupaItems: [...project.dupaItems, ...newDupa],
    updatedAt: new Date().toISOString(),
  };
}

export async function importCategoriesFromExcel(
  file: File,
  project: Project,
): Promise<{ project: Project; abcCount: number; dupaCount: number }> {
  const payload = await readPayload(file);
  if (!payload) {
    throw new Error(
      "This file does not contain a App category payload. Please export the category from App first.",
    );
  }
  const merged = mergeImportedCategories(project, {
    abcItems: payload.abcItems,
    dupaItems: payload.dupaItems,
  });
  return {
    project: merged,
    abcCount: payload.abcItems.length,
    dupaCount: payload.dupaItems.length,
  };
}
