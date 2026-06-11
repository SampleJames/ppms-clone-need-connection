import { MaterialItem, LaborItem, EquipmentItem, PriceListYear } from "@/types";
import { composeSpec } from "@/components/ui/spec-badge";

const PRICELIST_KEY = "costmgr_pricelist";

interface SpecLookup {
    byKey: Map<string, string>;
    byDesc: Map<string, string>;
}

let cachedLookup: SpecLookup | null = null;

function loadLookup(): SpecLookup {
  if (cachedLookup) return cachedLookup;
  const byKey = new Map<string, string>();
  const byDesc = new Map<string, string>();
  try {
    const raw = localStorage.getItem(PRICELIST_KEY);
    if (raw) {
      const years: PriceListYear[] = JSON.parse(raw);
      
      for (const y of years) {
        for (const it of y.items) {
          const spec = composeSpec(it.extraDesc1, it.extraDesc2);
          if (!spec) continue;
          const desc = (it.description || "").trim().toLowerCase();
          const unit = (it.unit || "").trim().toLowerCase();
          if (!desc) continue;
          byKey.set(`${desc}|${unit}`, spec);
          byDesc.set(desc, spec);
        }
      }
    }
  } catch {
    // ignore
  }
  cachedLookup = { byKey, byDesc };
  return cachedLookup;
}

/** Call this when the price list changes so the next backfill sees fresh data. */
export function invalidateSpecLookup() {
  cachedLookup = null;
}

function findSpec(desc: string, unit: string): string | undefined {
  const lookup = loadLookup();
  const d = desc.trim().toLowerCase();
  const u = unit.trim().toLowerCase();
  if (!d) return undefined;
  return lookup.byKey.get(`${d}|${u}`) ?? lookup.byDesc.get(d);
}

function backfillItem<T extends { description: string; specification?: string; unit?: string }>(
  item: T,
  unitFallback = "",
): T {
  if (item.specification && item.specification.trim()) return item;
  const spec = findSpec(item.description || "", item.unit ?? unitFallback);
  if (!spec) return item;
  return { ...item, specification: spec };
}

export function backfillMaterials(items: MaterialItem[]): MaterialItem[] {
  return items.map((m) => backfillItem(m));
}

export function backfillLabor(items: LaborItem[]): LaborItem[] {
  // Labor has no unit field — match by description only.
  return items.map((l) => backfillItem(l, ""));
}

export function backfillEquipment(items: EquipmentItem[]): EquipmentItem[] {
  return items.map((e) => backfillItem(e, ""));
}
