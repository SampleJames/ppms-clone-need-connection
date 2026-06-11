import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function compareItemNo(a: string, b: string): number {
  const pa = String(a ?? "").split(".");
  const pb = String(b ?? "").split(".");
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const sa = pa[i] ?? "";
    const sb = pb[i] ?? "";
    const na = Number(sa);
    const nb = Number(sb);
    const aNum = sa !== "" && !isNaN(na);
    const bNum = sb !== "" && !isNaN(nb);
    if (aNum && bNum) {
      if (na !== nb) return na - nb;
    } else {
      const cmp = sa.localeCompare(sb, undefined, { numeric: true });
      if (cmp !== 0) return cmp;
    }
  }
  return 0;
}

export function sortByItemNo<T extends { itemNo?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => compareItemNo(a.itemNo ?? "", b.itemNo ?? ""));
}
