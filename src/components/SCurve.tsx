import { useMemo, useState, useCallback, useRef, useEffect, Fragment } from "react";
import { Project, ABCItem, DUPAItem } from "@/types";
import { formatCurrency } from "@/lib/calculations";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RotateCcw, Info, X, Save, FolderOpen, Trash2, Eye, FileSpreadsheet } from "lucide-react";
import { exportSCurveToExcel } from "@/lib/scurveExcel";
import { resolveDocSettings } from "@/lib/printSettings";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import SCurveDateRanges, { DateRange } from "./SCurveDateRanges";

export interface SCurveSnapshot {
  id: string;
  name: string;
  createdAt: string;
  totalDuration: number;
  unit: "days" | "weeks" | "months";
  intervalDays: number;
  monthDays: number;
  scheduleData: Record<string, DateRange[]>;
}

const SCURVE_VERSIONS_KEY = "costmgr_scurve_versions";

function getAllSnapshots(): Record<string, SCurveSnapshot[]> {
  try {
    const data = localStorage.getItem(SCURVE_VERSIONS_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function getSnapshots(projectId: string): SCurveSnapshot[] {
  return getAllSnapshots()[projectId] || [];
}

function saveSnapshots(projectId: string, list: SCurveSnapshot[]) {
  const all = getAllSnapshots();
  all[projectId] = list;
  localStorage.setItem(SCURVE_VERSIONS_KEY, JSON.stringify(all));
}

interface Props {
  project: Project;
  compact?: boolean;
    initialSnapshot?: SCurveSnapshot | null;
    hideControls?: boolean;
}

function IntInput({ value, onChange, min = 1, max = 9999, className }: { value: number; onChange: (n: number) => void; min?: number; max?: number; className?: string }) {
  const [local, setLocal] = useState(String(value));
  const [focused, setFocused] = useState(false);
  if (!focused && String(value) !== local) setLocal(String(value));
  return (
    <Input
      type="text"
      inputMode="numeric"
      className={className}
      value={focused ? local : String(value)}
      onFocus={(e) => { setFocused(true); setLocal(String(value)); setTimeout(() => e.target.select(), 0); }}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "" || /^\d*$/.test(v)) setLocal(v);
      }}
      onBlur={() => {
        setFocused(false);
        const parsed = parseInt(local, 10);
        const clamped = isNaN(parsed) ? min : Math.min(max, Math.max(min, parsed));
        setLocal(String(clamped));
        onChange(clamped);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        const allowed = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Home", "End", "Enter"];
        if (allowed.includes(e.key) || e.ctrlKey || e.metaKey) return;
        if (!/^\d$/.test(e.key)) e.preventDefault();
      }}
    />
  );
}

interface CategoryRow {
  id: string;
  itemNo: string;
  description: string;
  cost: number;
  weightPercent: number;
  ranges: DateRange[];
}

interface SubRow {
  id: string;
  parentId: string; 
  itemNo: string;
  description: string;
  cost: number;
  weightPercent: number;
  ranges: DateRange[];
  depth: number;     
  isCategory: boolean;
}

const COLORS = [
  "#FFD700", "#32CD32", "#4169E1", "#FF8C00",
  "#9370DB", "#20B2AA", "#FF6347", "#708090",
];

const COL_W = {
  scope: "min-w-[200px] w-[200px] max-w-[200px]",
  cost: "min-w-[160px] w-[160px] max-w-[160px]",
  wt: "min-w-[60px] w-[60px] max-w-[60px]",
  dates: "min-w-[60px] w-[60px] max-w-[60px]",
  day: "min-w-[40px] w-[40px] max-w-[40px]",
};

const STICKY = {
  scope: "sticky left-0",
  cost: "sticky left-[200px]",
  wt: "sticky left-[360px]",
  dates: "sticky left-[420px]",
};

export default function SCurve({ project, compact = false, initialSnapshot, hideControls = false }: Props) {
  const [totalDuration, setTotalDuration] = useState(initialSnapshot?.totalDuration ?? 90);
  const [unit, setUnit] = useState<"days" | "weeks" | "months">(initialSnapshot?.unit ?? "days");
  const [intervalDays, setIntervalDays] = useState(initialSnapshot?.intervalDays ?? 5);
  const [monthDays, setMonthDays] = useState(initialSnapshot?.monthDays ?? 30);
  const [scheduleData, setScheduleData] = useState<Record<string, DateRange[]>>(initialSnapshot?.scheduleData ?? {});
  const [showCurve, setShowCurve] = useState(true);
  const [detailedView, setDetailedView] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [pinnedCols, setPinnedCols] = useState<Set<number>>(new Set());
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [versionName, setVersionName] = useState("");
  const [snapshots, setSnapshots] = useState<SCurveSnapshot[]>(() => getSnapshots(project.id));
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const ganttRef = useRef<HTMLTableSectionElement>(null);

  // Recursive cost: sum totalCost of all non-category descendants of an ABC item.
  const getDescendantCost = useCallback((itemId: string): number => {
    const children = project.abcItems.filter((i) => i.parentId === itemId);
    let sum = 0;
    children.forEach((c) => {
      if (c.isCategory) {
        sum += getDescendantCost(c.id);
      } else {
        sum += c.totalCost;
      }
    });
    return sum;
  }, [project.abcItems]);

  // Top-level categories (parentId == null, isCategory)
  const categories = useMemo(() => {
    const tops = project.abcItems.filter((i) => i.isCategory && !i.parentId);
    return tops
      .map((cat) => {
        const totalCost = getDescendantCost(cat.id);
        return { ...cat, totalCost: totalCost > 0 ? totalCost : cat.totalCost };
      });
  }, [project.abcItems, getDescendantCost]);

  const grandTotal = useMemo(() => categories.reduce((s, c) => s + c.totalCost, 0), [categories]);

  const rows: CategoryRow[] = useMemo(() => {
    if (grandTotal === 0) return [];
    return categories.map((cat) => ({
      id: cat.id,
      itemNo: cat.itemNo,
      description: cat.description,
      cost: cat.totalCost,
      weightPercent: Math.round((cat.totalCost / grandTotal) * 10000) / 100,
      ranges: scheduleData[cat.id] || [],
    }));
  }, [categories, grandTotal, scheduleData]);

  // Recursive ABC sub-rows for detailed view: every descendant (sub-categories + items),
  // skipping items that have no cost (and categories with no cost descendants).
  const abcSubRows = useMemo((): Record<string, SubRow[]> => {
    if (!detailedView || grandTotal === 0) return {};
    const result: Record<string, SubRow[]> = {};
    const walk = (parentItemId: string, topCatId: string, depth: number, out: SubRow[]) => {
      const kids = project.abcItems
        .filter((i) => i.parentId === parentItemId)
        .sort((a, b) => a.order - b.order);
      kids.forEach((k) => {
        const cost = k.isCategory ? getDescendantCost(k.id) : k.totalCost;
        if (cost <= 0) return;
        out.push({
          id: k.id,
          parentId: topCatId,
          itemNo: k.itemNo,
          description: k.description,
          cost,
          weightPercent: Math.round((cost / grandTotal) * 10000) / 100,
          ranges: scheduleData[k.id] || [],
          depth,
          isCategory: k.isCategory,
        });
        if (k.isCategory) walk(k.id, topCatId, depth + 1, out);
      });
    };
    categories.forEach((cat) => {
      const out: SubRow[] = [];
      walk(cat.id, cat.id, 1, out);
      if (out.length > 0) result[cat.id] = out;
    });
    return result;
  }, [detailedView, categories, project.abcItems, grandTotal, scheduleData, getDescendantCost]);

  const updateRanges = useCallback((id: string, ranges: DateRange[]) => {
    setScheduleData((prev) => ({ ...prev, [id]: ranges }));
  }, []);

  const autoDistribute = useCallback(() => {
    const count = categories.length;
    if (count === 0) return;
    const newData: Record<string, DateRange[]> = {};
    const itemDur = Math.round(totalDuration * 0.5);
    const step = Math.round((totalDuration - itemDur) / Math.max(count - 1, 1));
    categories.forEach((cat, idx) => {
      const from = Math.min(idx * step, totalDuration);
      const to = Math.min(from + itemDur, totalDuration);
      newData[cat.id] = [{ from, to }];
    });
    setScheduleData(newData);
  }, [categories, totalDuration]);

  const columns = useMemo(() => {
    const cols: number[] = [];
    for (let i = intervalDays; i <= totalDuration; i += intervalDays) {
      cols.push(i);
    }
    if (cols.length === 0 || cols[cols.length - 1] < totalDuration) {
      cols.push(totalDuration);
    }
    return cols;
  }, [totalDuration, intervalDays]);

  const monthGroups = useMemo(() => {
    const groups: { label: string; span: number; startCol: number }[] = [];
    let monthStart = 0;
    let colIdx = 0;
    while (colIdx < columns.length) {
      const monthEnd = monthStart + monthDays;
      let span = 0;
      const startCol = colIdx;
      while (colIdx < columns.length && columns[colIdx] <= monthEnd) {
        span++;
        colIdx++;
      }
      if (span > 0) {
        groups.push({ label: `${monthDays} Calendar Days`, span, startCol });
      }
      monthStart = monthEnd;
    }
    return groups;
  }, [columns, monthDays]);

  const isDayActive = (ranges: DateRange[], day: number) => {
    return ranges.some(r => day >= r.from && day < r.to);
  };

  const getActiveDays = (ranges: DateRange[]) => {
    return ranges.reduce((sum, r) => sum + Math.max(0, r.to - r.from), 0);
  };

  const { columnWeights, cumulativeProgress, cumulativeCost, monthlyAccPct, monthlyAccCost, cumAccPct, cumAccCost } = useMemo(() => {
    const colWeights: number[] = columns.map(() => 0);

    rows.forEach((row) => {
      const activeDays = getActiveDays(row.ranges);
      if (activeDays <= 0) return;
      columns.forEach((colDay, colIdx) => {
        const prevCol = colIdx === 0 ? 0 : columns[colIdx - 1];
        let activeDaysInCol = 0;
        for (let d = prevCol; d < colDay; d++) {
          if (isDayActive(row.ranges, d)) activeDaysInCol++;
        }
        if (activeDaysInCol > 0) {
          const fraction = activeDaysInCol / activeDays;
          colWeights[colIdx] += row.weightPercent * fraction;
        }
      });
    });

    const cumulative: number[] = [];
    const cumCost: number[] = [];
    let cum = 0;
    colWeights.forEach((w) => {
      cum += w;
      const capped = Math.min(cum, 100);
      cumulative.push(Math.round(capped * 100) / 100);
      cumCost.push(Math.round(grandTotal * capped / 100 * 100) / 100);
    });

    const mAccPct: number[] = monthGroups.map(() => 0);
    const mAccCost: number[] = monthGroups.map(() => 0);
    monthGroups.forEach((mg, mIdx) => {
      let monthSum = 0;
      for (let c = mg.startCol; c < mg.startCol + mg.span; c++) {
        monthSum += colWeights[c] || 0;
      }
      mAccPct[mIdx] = Math.round(monthSum * 100) / 100;
      mAccCost[mIdx] = Math.round(grandTotal * monthSum / 100 * 100) / 100;
    });

    const cAccPct: number[] = [];
    const cAccCost: number[] = [];
    let cAcc = 0;
    let cAccPhp = 0;
    mAccPct.forEach((m, i) => {
      cAcc += m;
      cAccPhp += mAccCost[i] || 0;
      const capped = Math.min(cAcc, 100);
      cAccPct.push(Math.round(capped * 100) / 100);
      // Cumulative ₱ is the running sum of Monthly Accomplishment ₱
      cAccCost.push(Math.round(Math.min(cAccPhp, grandTotal) * 100) / 100);
    });

    return {
      columnWeights: colWeights.map((w) => Math.round(w * 100) / 100),
      cumulativeProgress: cumulative,
      cumulativeCost: cumCost,
      monthlyAccPct: mAccPct,
      monthlyAccCost: mAccCost,
      cumAccPct: cAccPct,
      cumAccCost: cAccCost,
    };
  }, [rows, columns, grandTotal, monthGroups]);

  const hasSchedule = rows.some((r) => r.ranges.length > 0 && getActiveDays(r.ranges) > 0);

  const [svgDims, setSvgDims] = useState({ width: 0, height: 0, left: 0, top: 0 });

  useEffect(() => {
    if (!ganttRef.current || !hasSchedule) return;
    const updateDims = () => {
      const tbody = ganttRef.current;
      if (!tbody) return;
      const firstRow = tbody.querySelector("tr");
      if (!firstRow) return;
      const cells = firstRow.querySelectorAll("td");
      const fixedCols = 4;
      if (cells.length <= fixedCols) return;
      const firstTimeCell = cells[fixedCols];
      const lastTimeCell = cells[cells.length - 1];
      const containerRect = tbody.closest(".overflow-x-auto")?.getBoundingClientRect();
      if (!containerRect) return;
      const firstRect = firstTimeCell.getBoundingClientRect();
      const lastRect = lastTimeCell.getBoundingClientRect();
      const catRows = tbody.querySelectorAll("tr.gantt-row");
      let totalHeight = 0;
      catRows.forEach(r => totalHeight += r.getBoundingClientRect().height);

      const scrollEl = tbody.closest(".overflow-x-auto") as HTMLElement | null;
      const scrollLeft = scrollEl?.scrollLeft ?? 0;
      const scrollTop = scrollEl?.scrollTop ?? 0;

      setSvgDims({
        width: lastRect.right - firstRect.left,
        height: totalHeight,
        left: firstRect.left - containerRect.left + scrollLeft,
        top: firstRect.top - containerRect.top + scrollTop,
      });
    };
    updateDims();
    const scrollEl = ganttRef.current?.closest(".overflow-x-auto") as HTMLElement | null;
    scrollEl?.addEventListener("scroll", updateDims, { passive: true });
    const observer = new ResizeObserver(updateDims);
    if (ganttRef.current) observer.observe(ganttRef.current);
    return () => {
      observer.disconnect();
      scrollEl?.removeEventListener("scroll", updateDims);
    };
  }, [hasSchedule, columns, rows, detailedView]);

  const curvePath = useMemo(() => {
    if (!hasSchedule || columns.length < 2 || svgDims.width === 0) return "";

    // Gaussian-smooth the cumulative progress so dense / irregular schedules
    // still render as a clean S-curve. Sigma scales with the number of
    // columns; endpoints (0% start, final %) are preserved by clamping.
    const cp = cumulativeProgress.slice();
    const N = cp.length;
    const smoothed = cp.slice();
    if (N >= 4) {
      const sigma = Math.max(0.6, Math.min(N / 12, 6));
      const radius = Math.max(1, Math.ceil(sigma * 2.5));
      const weights: number[] = [];
      for (let k = -radius; k <= radius; k++) {
        weights.push(Math.exp(-(k * k) / (2 * sigma * sigma)));
      }
      for (let i = 0; i < N; i++) {
        let sum = 0;
        let wsum = 0;
        for (let k = -radius; k <= radius; k++) {
          const j = i + k;
          if (j < 0 || j >= N) continue;
          const w = weights[k + radius];
          sum += cp[j] * w;
          wsum += w;
        }
        smoothed[i] = wsum > 0 ? sum / wsum : cp[i];
      }
      // Preserve final cumulative value (so curve still hits the true total).
      smoothed[N - 1] = cp[N - 1];
      // Re-monotonize after smoothing (Gaussian on near-flat tails can dip).
      for (let i = 1; i < N; i++) {
        if (smoothed[i] < smoothed[i - 1]) smoothed[i] = smoothed[i - 1];
      }
    }

    const points = smoothed.map((v, i) => {
      const x = ((i + 0.5) / columns.length) * svgDims.width;
      const y = svgDims.height - (v / 100) * svgDims.height;
      return { x, y };
    });
    const n = points.length;
    if (n === 0) return "";
    if (n === 1) return `M ${points[0].x} ${points[0].y}`;

    // Monotone cubic Hermite (Fritsch–Carlson) — smooth, no overshoot.
    const dx: number[] = [];
    const slopes: number[] = []; // secant slopes between points
    for (let i = 0; i < n - 1; i++) {
      const h = points[i + 1].x - points[i].x;
      dx.push(h);
      slopes.push(h === 0 ? 0 : (points[i + 1].y - points[i].y) / h);
    }
    const m: number[] = new Array(n).fill(0);
    m[0] = slopes[0];
    m[n - 1] = slopes[n - 2];
    for (let i = 1; i < n - 1; i++) {
      if (slopes[i - 1] * slopes[i] <= 0) {
        m[i] = 0;
      } else {
        const w1 = 2 * dx[i] + dx[i - 1];
        const w2 = dx[i] + 2 * dx[i - 1];
        m[i] = (w1 + w2) / (w1 / slopes[i - 1] + w2 / slopes[i]);
      }
    }
    // Enforce monotonicity
    for (let i = 0; i < n - 1; i++) {
      if (slopes[i] === 0) {
        m[i] = 0;
        m[i + 1] = 0;
      } else {
        const a = m[i] / slopes[i];
        const b = m[i + 1] / slopes[i];
        const h = Math.hypot(a, b);
        if (h > 3) {
          const t = 3 / h;
          m[i] = t * a * slopes[i];
          m[i + 1] = t * b * slopes[i];
        }
      }
    }
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < n - 1; i++) {
      const h = dx[i];
      const cp1x = points[i].x + h / 3;
      const cp1y = points[i].y + (m[i] * h) / 3;
      const cp2x = points[i + 1].x - h / 3;
      const cp2y = points[i + 1].y - (m[i + 1] * h) / 3;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${points[i + 1].x} ${points[i + 1].y}`;
    }
    return d;
  }, [cumulativeProgress, columns, hasSchedule, svgDims]);

  const areaPath = useMemo(() => {
    if (!curvePath || svgDims.width === 0) return "";
    const lastX = ((columns.length - 0.5) / columns.length) * svgDims.width;
    const firstX = (0.5 / columns.length) * svgDims.width;
    return `${curvePath} L ${lastX} ${svgDims.height} L ${firstX} ${svgDims.height} Z`;
  }, [curvePath, svgDims, columns]);

  // Build tooltip data for a column index
  const getColTooltipData = useCallback((colIdx: number) => {
    const colDay = columns[colIdx];
    const prevCol = colIdx === 0 ? 0 : columns[colIdx - 1];
    const activeCategories = rows.filter(row => {
      for (let d = prevCol; d < colDay; d++) {
        if (isDayActive(row.ranges, d)) return true;
      }
      return false;
    });
    return {
      dayRange: `Day ${prevCol + 1}–${colDay}`,
      colDay,
      periodicWeight: columnWeights[colIdx] ?? 0,
      cumulativePct: cumulativeProgress[colIdx] ?? 0,
      cumulativeCostVal: cumulativeCost[colIdx] ?? 0,
      activeCategories: activeCategories.map(r => r.description),
    };
  }, [columns, rows, columnWeights, cumulativeProgress, cumulativeCost]);

  const handleColMouseEnter = useCallback((colIdx: number, e: React.MouseEvent) => {
    setHoveredCol(colIdx);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltipPos({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
  }, []);

  const handleColMouseLeave = useCallback(() => {
    setHoveredCol(null);
    setTooltipPos(null);
  }, []);

  const handleColClick = useCallback((colIdx: number) => {
    setPinnedCols(prev => {
      const next = new Set(prev);
      if (next.has(colIdx)) {
        next.delete(colIdx);
      } else {
        next.add(colIdx);
      }
      return next;
    });
  }, []);

  const removePinnedCol = useCallback((colIdx: number) => {
    setPinnedCols(prev => {
      const next = new Set(prev);
      next.delete(colIdx);
      return next;
    });
  }, []);

  const handleSaveVersion = useCallback(() => {
    const name = versionName.trim();
    if (!name) return;
    const snap: SCurveSnapshot = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      totalDuration,
      unit,
      intervalDays,
      monthDays,
      scheduleData: JSON.parse(JSON.stringify(scheduleData)),
    };
    const next = [snap, ...snapshots];
    setSnapshots(next);
    saveSnapshots(project.id, next);
    setVersionName("");
    setSaveOpen(false);
    toast({ title: "S-Curve version saved", description: name });
  }, [versionName, totalDuration, unit, intervalDays, monthDays, scheduleData, snapshots, project.id]);

  const handleLoadVersion = useCallback((snap: SCurveSnapshot) => {
    setTotalDuration(snap.totalDuration);
    setUnit(snap.unit);
    setIntervalDays(snap.intervalDays);
    setMonthDays(snap.monthDays);
    setScheduleData(snap.scheduleData || {});
    setPreviewingId(snap.id);
    setVersionsOpen(false);
    toast({ title: "Loaded S-Curve version", description: snap.name });
  }, []);

  const handleDeleteVersion = useCallback((id: string) => {
    const next = snapshots.filter((s) => s.id !== id);
    setSnapshots(next);
    saveSnapshots(project.id, next);
    if (previewingId === id) setPreviewingId(null);
  }, [snapshots, project.id, previewingId]);

  if (categories.length === 0 || grandTotal === 0) {
    return (
      <div className="mt-4 text-center py-12 text-muted-foreground border rounded-lg bg-card">
        <p className="font-medium text-lg">No data for S-Curve</p>
        <p className="text-sm mt-1">Add category items with costs to the ABC table to generate the S-Curve.</p>
      </div>
    );
  }

  const fixedColSpan = 4;

  
  const renderDayCell = (colIdx: number, colDay: number, ranges: DateRange[], color: string, opacity: number, rowKey: string) => {
    const prevCol = colIdx === 0 ? 0 : columns[colIdx - 1];
    let isActive = false;
    for (let d = prevCol; d < colDay; d++) {
      if (isDayActive(ranges, d)) { isActive = true; break; }
    }
    const isPinned = pinnedCols.has(colIdx);
    const isHovered = hoveredCol === colIdx;
    return (
      <td
        key={`${rowKey}-${colIdx}`}
        className={`border border-border/30 px-0 py-0 relative cursor-pointer ${COL_W.day} ${isHovered ? "bg-primary/5" : ""} ${isPinned ? "bg-primary/10" : ""}`}
        style={{ height: 24 }}
        onMouseEnter={(e) => handleColMouseEnter(colIdx, e)}
        onMouseLeave={handleColMouseLeave}
        onClick={() => handleColClick(colIdx)}
      >
        {isActive && (
          <div
            className="absolute inset-0.5 rounded-sm"
            style={{ backgroundColor: color, opacity }}
          />
        )}
        {isPinned && (
          <div className="absolute inset-y-0 left-1/2 w-0.5 bg-primary z-[5] -translate-x-1/2" />
        )}
      </td>
    );
  };

  return (
    <div className="mt-4 space-y-4">
      {}
      {!hideControls && (
      <div className="flex items-end gap-3 flex-wrap p-3 rounded-lg border bg-card">
        <div>
          <Label className="text-[10px] font-medium text-muted-foreground">Total Duration</Label>
          <IntInput value={totalDuration} onChange={setTotalDuration} min={1} max={9999} className="h-8 w-20 text-xs mt-0.5" />
        </div>
        <div>
          <Label className="text-[10px] font-medium text-muted-foreground">Interval</Label>
          <IntInput value={intervalDays} onChange={setIntervalDays} min={1} max={9999} className="h-8 w-16 text-xs mt-0.5" />
        </div>
        <div>
          <Label className="text-[10px] font-medium text-muted-foreground">Days/Month</Label>
          <IntInput value={monthDays} onChange={setMonthDays} min={1} max={9999} className="h-8 w-16 text-xs mt-0.5" />
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={autoDistribute}>
          <RotateCcw className="h-3 w-3 mr-1" />
          Auto Schedule
        </Button>
        <div className="flex items-center gap-2">
          <Label className="text-[10px] text-muted-foreground">S-Curve</Label>
          <Switch checked={showCurve} onCheckedChange={setShowCurve} className="scale-75" />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-[10px] text-muted-foreground">Detailed</Label>
          <Switch checked={detailedView} onCheckedChange={setDetailedView} className="scale-75" />
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setSaveOpen(true)}>
          <Save className="h-3 w-3 mr-1" />
          Save
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setVersionsOpen(true)}>
          <FolderOpen className="h-3 w-3 mr-1" />
          Versions {snapshots.length > 0 && <span className="ml-1 text-muted-foreground">({snapshots.length})</span>}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={async () => {
            try {
              const settings = resolveDocSettings(project, "scurve");
              await exportSCurveToExcel(project, settings, {
                totalDuration, intervalDays, monthDays, scheduleData,
              });
              toast({ title: "Excel exported", description: "S-Curve workbook downloaded." });
            } catch (e) {
              toast({ title: "Export failed", description: String(e), variant: "destructive" });
            }
          }}
        >
          <FileSpreadsheet className="h-3 w-3 mr-1" />
          Export S-Curve
        </Button>
        <div className="ml-auto text-xs text-muted-foreground">
          Grand Total: <span className="font-bold text-foreground">₱{formatCurrency(grandTotal)}</span>
        </div>
      </div>
      )}

      {}
      {pinnedCols.size > 0 && (
        <div className="flex gap-2 flex-wrap">
          {Array.from(pinnedCols).sort((a, b) => a - b).map(colIdx => {
            const data = getColTooltipData(colIdx);
            return (
              <div key={colIdx} className="rounded-lg border bg-card p-3 text-xs shadow-sm relative min-w-[180px]">
                <button
                  className="absolute top-1 right-1 p-0.5 rounded hover:bg-muted"
                  onClick={() => removePinnedCol(colIdx)}
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
                <div className="font-semibold text-foreground mb-1">📌 {data.dayRange}</div>
                <div className="space-y-0.5 text-muted-foreground">
                  <div>Periodic Wt: <span className="font-mono text-foreground">{data.periodicWeight.toFixed(2)}%</span></div>
                  <div>Cumulative: <span className="font-mono text-foreground">{data.cumulativePct.toFixed(2)}%</span></div>
                  <div>Cost: <span className="font-mono text-foreground">₱{formatCurrency(data.cumulativeCostVal)}</span></div>
                  {data.activeCategories.length > 0 && (
                    <div className="mt-1 pt-1 border-t border-border/50">
                      <span className="font-medium text-foreground">Active:</span>
                      {data.activeCategories.map((c, i) => (
                        <div key={i} className="pl-2">• {c}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {}
      <div className="rounded-lg border bg-card overflow-hidden" data-scurve-print-root>
        <div className="overflow-x-auto relative" ref={tableRef}>
          {}
          {showCurve && hasSchedule && svgDims.width > 0 && (
            <svg
              className="absolute pointer-events-none"
              style={{
                left: svgDims.left,
                top: svgDims.top,
                width: svgDims.width,
                height: svgDims.height,
                zIndex: 10,
              }}
            >
              {areaPath && (
                <path d={areaPath} fill="hsl(210, 80%, 55%)" opacity={0.15} />
              )}
              {curvePath && (
                <path d={curvePath} fill="none" stroke="hsl(210, 80%, 40%)" strokeWidth={2.5} strokeLinecap="round" />
              )}
              {}
              {Array.from(pinnedCols).map(colIdx => {
                const x = ((colIdx + 0.5) / columns.length) * svgDims.width;
                return (
                  <line
                    key={colIdx}
                    x1={x} y1={0} x2={x} y2={svgDims.height}
                    stroke="hsl(var(--primary))"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    opacity={0.7}
                  />
                );
              })}
            </svg>
          )}

          <table className="w-full text-[11px] border-collapse">
            <thead>
              {}
              <tr className="bg-[hsl(142,40%,35%)] text-white">
                <th className={`border border-border/50 px-2 py-1 text-left ${STICKY.scope} bg-[hsl(142,40%,35%)] z-30 ${COL_W.scope}`} rowSpan={2}>
                  SCOPE OF WORK
                </th>
                <th className={`border border-border/50 px-2 py-1 text-center ${STICKY.cost} bg-[hsl(142,40%,35%)] z-30 ${COL_W.cost}`} rowSpan={2}>COST</th>
                <th className={`border border-border/50 px-2 py-1 text-center ${STICKY.wt} bg-[hsl(142,40%,35%)] z-30 ${COL_W.wt}`} rowSpan={2}>WT. %</th>
                <th className={`border border-border/50 px-1 py-1 text-center ${STICKY.dates} bg-[hsl(142,40%,35%)] z-30 ${COL_W.dates}`} rowSpan={2}>-</th>
                {monthGroups.map((mg, i) => (
                  <th
                    key={i}
                    className="border border-border/50 px-1 py-1 text-center"
                    colSpan={mg.span}
                  >
                    {mg.label}
                  </th>
                ))}
              </tr>
              {}
              <tr className="bg-[hsl(142,40%,30%)] text-white">
                {columns.map((col, i) => {
                  const prevCol = i === 0 ? 0 : columns[i - 1];
                  const span = col - prevCol;
                  return (
                    <th key={i} className={`border border-border/50 px-0 py-0 text-center ${COL_W.day}`}>
                      <div className="text-[10px] py-0.5">{col}</div>
                      {span > 1 && (
                        <div className="flex w-full border-t border-white/20" style={{ height: 10 }}>
                          {Array.from({ length: span }, (_, j) => {
                            const dayNum = prevCol + j + 1;
                            return (
                              <div
                                key={j}
                                className="flex-1 relative group/tick cursor-default"
                                style={{ borderRight: j < span - 1 ? '1px solid rgba(255,255,255,0.2)' : 'none' }}
                              >
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 rounded bg-foreground text-background text-[9px] whitespace-nowrap opacity-0 group-hover/tick:opacity-100 pointer-events-none z-50 transition-opacity">
                                  Day {dayNum}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody ref={ganttRef}>
              {}
              {rows.map((row, rowIdx) => {
                const color = COLORS[rowIdx % COLORS.length];
                const subRows = detailedView ? (abcSubRows[row.id] || []) : [];
                return (
                  <Fragment key={row.id}>
                    <tr className="gantt-row border-b border-border/30 hover:bg-muted/10">
                      <td className={`border border-border/30 px-2 py-1 ${STICKY.scope} bg-background z-20 font-medium whitespace-nowrap ${COL_W.scope}`}>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                          <span className="truncate" title={row.description}>{row.description}</span>
                        </div>
                      </td>
                      <td className={`border border-border/30 px-2 py-1 text-right font-mono whitespace-nowrap ${STICKY.cost} bg-background z-20 ${COL_W.cost}`}>
                        ₱{formatCurrency(row.cost ?? 0)}
                      </td>
                      <td className={`border border-border/30 px-2 py-1 text-center font-mono ${STICKY.wt} bg-background z-20 ${COL_W.wt}`}>
                        {(row.weightPercent ?? 0).toFixed(2)}
                      </td>
                      <td className={`border border-border/30 px-0.5 py-1 text-center ${STICKY.dates} bg-background z-20 ${COL_W.dates}`}>
                        <SCurveDateRanges
                          ranges={row.ranges}
                          onChange={(r) => updateRanges(row.id, r)}
                          maxDuration={totalDuration}
                        />
                      </td>
                      {columns.map((colDay, colIdx) =>
                        renderDayCell(colIdx, colDay, row.ranges, color, 0.7, row.id)
                      )}
                    </tr>
                    {}
                    {subRows.map((sub) => {
                      const indentPx = 8 + sub.depth * 12;
                      const dotOpacity = sub.isCategory ? 0.7 : 0.4;
                      return (
                        <tr key={sub.id} className="gantt-row border-b border-border/20 bg-muted/5 hover:bg-muted/15">
                          <td className={`border border-border/20 px-2 py-0.5 ${STICKY.scope} bg-[hsl(220,15%,97%)] z-20 whitespace-nowrap ${COL_W.scope}`}>
                            <div className="flex items-center gap-1" style={{ paddingLeft: indentPx }}>
                              <div
                                className={`flex-shrink-0 ${sub.isCategory ? "w-1.5 h-1.5 rounded-sm" : "w-1.5 h-1.5 rounded-full"}`}
                                style={{ backgroundColor: color, opacity: dotOpacity }}
                              />
                              <span
                                className={`truncate text-[10px] ${sub.isCategory ? "font-medium text-foreground" : "text-muted-foreground"}`}
                                title={sub.description}
                              >
                                {sub.description}
                              </span>
                            </div>
                          </td>
                          <td className={`border border-border/20 px-2 py-0.5 text-right font-mono text-[10px] text-muted-foreground ${STICKY.cost} bg-[hsl(220,15%,97%)] z-20 ${COL_W.cost}`}>
                            ₱{formatCurrency(sub.cost ?? 0)}
                          </td>
                          <td className={`border border-border/20 px-2 py-0.5 text-center font-mono text-[10px] text-muted-foreground ${STICKY.wt} bg-[hsl(220,15%,97%)] z-20 ${COL_W.wt}`}>
                            {(sub.weightPercent ?? 0).toFixed(2)}
                          </td>
                          <td className={`border border-border/20 px-0.5 py-0.5 text-center ${STICKY.dates} bg-[hsl(220,15%,97%)] z-20 ${COL_W.dates}`}>
                            <SCurveDateRanges
                              ranges={sub.ranges}
                              onChange={(r) => updateRanges(sub.id, r)}
                              maxDuration={totalDuration}
                            />
                          </td>
                          {columns.map((colDay, colIdx) =>
                            renderDayCell(colIdx, colDay, sub.ranges.length > 0 ? sub.ranges : row.ranges, color, 0.35, sub.id)
                          )}
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}

              {}
              <tr className="font-bold bg-[hsl(142,40%,90%)] border-t-2 border-border">
                <td className={`border border-border/30 px-2 py-1 ${STICKY.scope} bg-[hsl(142,40%,90%)] z-20 ${COL_W.scope}`}>TOTAL</td>
                <td className={`border border-border/30 px-2 py-1 text-right font-mono ${STICKY.cost} bg-[hsl(142,40%,90%)] z-20 ${COL_W.cost}`}>₱{formatCurrency(grandTotal)}</td>
                <td className={`border border-border/30 px-2 py-1 text-center ${STICKY.wt} bg-[hsl(142,40%,90%)] z-20 ${COL_W.wt}`}>100.00</td>
                <td className={`border border-border/30 ${STICKY.dates} bg-[hsl(142,40%,90%)] z-20 ${COL_W.dates}`}></td>
                {columns.map((_, i) => <td key={i} className={`border border-border/30 ${COL_W.day}`}></td>)}
              </tr>

              {}
              <tr className="bg-muted/20">
                <td className="border border-border/30 px-2 py-1 sticky left-0 bg-muted/20 z-10" colSpan={fixedColSpan}></td>
                {columns.map((_, i) => <td key={i} className={`border border-border/30 ${COL_W.day}`}></td>)}
              </tr>

              {}
              <tr className="bg-background">
                <td className="border border-border/30 px-2 py-0.5 sticky left-0 bg-background z-10" colSpan={fixedColSpan}></td>
                {columnWeights.map((w, i) => (
                  <td key={i} className={`border border-border/30 text-center text-[9px] font-mono px-0 ${COL_W.day}`}>
                    {w != null && w > 0 ? w.toFixed(2) : "0"}
                  </td>
                ))}
              </tr>

              {}
              <tr className="bg-background">
                <td className="border border-border/30 sticky left-0 bg-background z-10" colSpan={2}></td>
                <td className="border border-border/30 text-[9px] font-semibold text-right pr-1 sticky bg-background z-10" colSpan={2}>
                  CUMULATIVE<br/>PROGRESS (%)
                </td>
                {cumulativeProgress.map((cp, i) => (
                  <td key={i} className={`border border-border/30 text-center text-[9px] font-mono px-0 ${COL_W.day}`}>
                    {cp != null && cp > 0 ? cp.toFixed(2) : "0"}
                  </td>
                ))}
              </tr>

              {}
              <tr className="bg-[hsl(45,90%,85%)]">
                <td className="border border-border/30 px-2 py-0.5 sticky left-0 bg-[hsl(45,90%,85%)] z-10 text-[9px] font-semibold text-destructive" colSpan={fixedColSpan}>
                  MONTHLY ACCOMPLISHMENT (%)
                </td>
                {monthGroups.map((mg, mIdx) => (
                  <td key={mIdx} className="border border-border/30 text-center text-[9px] font-bold text-destructive px-0" colSpan={mg.span}>
                    {(monthlyAccPct[mIdx] ?? 0) > 0 ? (monthlyAccPct[mIdx] ?? 0).toFixed(2) : ""}
                  </td>
                ))}
              </tr>

              {/* MONTHLY ACCOMPLISHMENT (₱) */}
              <tr className="bg-[hsl(45,90%,85%)]">
                <td className="border border-border/30 px-2 py-0.5 sticky left-0 bg-[hsl(45,90%,85%)] z-10 text-[9px] font-semibold text-destructive" colSpan={fixedColSpan}>
                  MONTHLY ACCOMPLISHMENT (₱)
                </td>
                {monthGroups.map((mg, mIdx) => (
                  <td key={mIdx} className="border border-border/30 text-center text-[9px] font-bold px-0 whitespace-nowrap" colSpan={mg.span}>
                    {monthlyAccCost[mIdx] > 0 ? `₱${formatCurrency(monthlyAccCost[mIdx])}` : ""}
                  </td>
                ))}
              </tr>

              {/* CUMULATIVE ACCOMPLISHMENT (%) */}
              <tr className="bg-[hsl(45,80%,75%)]">
                <td className="border border-border/30 px-2 py-0.5 sticky left-0 bg-[hsl(45,80%,75%)] z-10 text-[9px] font-semibold text-destructive" colSpan={fixedColSpan}>
                  CUMULATIVE ACCOMPLISHMENT (%)
                </td>
                {monthGroups.map((mg, mIdx) => (
                  <td key={mIdx} className="border border-border/30 text-center text-[9px] font-bold px-0" colSpan={mg.span}>
                    {(cumAccPct[mIdx] ?? 0) > 0 ? (cumAccPct[mIdx] ?? 0).toFixed(2) : ""}
                  </td>
                ))}
              </tr>

              {/* CUMULATIVE ACCOMPLISHMENT (₱) */}
              <tr className="bg-[hsl(0,70%,60%)] text-white">
                <td className="border border-border/50 px-2 py-0.5 sticky left-0 bg-[hsl(0,70%,60%)] z-10 text-[9px] font-semibold" colSpan={fixedColSpan}>
                  CUMULATIVE ACCOMPLISHMENT (₱)
                </td>
                {monthGroups.map((mg, mIdx) => (
                  <td key={mIdx} className="border border-border/50 text-center text-[9px] font-bold px-0 whitespace-nowrap" colSpan={mg.span}>
                    {cumAccCost[mIdx] > 0 ? `₱${formatCurrency(cumAccCost[mIdx])}` : ""}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Dialog */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>How the S-Curve is Computed</DialogTitle>
            <DialogDescription>Detailed breakdown of each calculation step.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="font-semibold text-foreground mb-1">1. Categories & Costs</h3>
              <p className="text-muted-foreground">Only <strong>category-level</strong> ABC items are shown. Each category's cost is the <strong>sum of all its child DUPA items'</strong> total costs.</p>
              <div className="mt-2 rounded border overflow-hidden">
                <table className="w-full text-xs">
                  <thead><tr className="bg-muted"><th className="px-2 py-1 text-left">Category</th><th className="px-2 py-1 text-right">Cost (₱)</th><th className="px-2 py-1 text-right">Weight %</th></tr></thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.id} className="border-t border-border/50">
                        <td className="px-2 py-1">{r.description}</td>
                        <td className="px-2 py-1 text-right">₱{formatCurrency(r.cost)}</td>
                        <td className="px-2 py-1 text-right">{r.weightPercent}%</td>
                      </tr>
                    ))}
                    <tr className="border-t border-border font-semibold bg-muted">
                      <td className="px-2 py-1">Grand Total</td>
                      <td className="px-2 py-1 text-right">₱{formatCurrency(grandTotal)}</td>
                      <td className="px-2 py-1 text-right">100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">2. Weight Percentage</h3>
              <p className="text-muted-foreground">Each category's weight is calculated as:</p>
              <code className="block bg-muted px-3 py-2 rounded text-xs mt-1">Weight % = (Category Cost ÷ Grand Total) × 100</code>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">3. Date Ranges & Active Days</h3>
              <p className="text-muted-foreground">Each category can have <strong>multiple date ranges</strong> (From → To days). The total <strong>active days</strong> is the sum of all range durations.</p>
              <div className="mt-2 rounded border overflow-hidden">
                <table className="w-full text-xs">
                  <thead><tr className="bg-muted"><th className="px-2 py-1 text-left">Category</th><th className="px-2 py-1 text-left">Ranges</th><th className="px-2 py-1 text-right">Active Days</th></tr></thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.id} className="border-t border-border/50">
                        <td className="px-2 py-1">{r.description}</td>
                        <td className="px-2 py-1">{r.ranges.length > 0 ? r.ranges.map(rng => `${rng.from}–${rng.to}`).join(", ") : "Not set"}</td>
                        <td className="px-2 py-1 text-right">{getActiveDays(r.ranges)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">4. Per-Column Weight Distribution</h3>
              <p className="text-muted-foreground">For each time column interval, the system counts how many <strong>active days</strong> fall within that interval for each category. The weight contribution is:</p>
              <code className="block bg-muted px-3 py-2 rounded text-xs mt-1">Column Weight += Category Weight % × (Active Days in Interval ÷ Total Active Days)</code>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">5. Periodic & Cumulative Progress</h3>
              <p className="text-muted-foreground"><strong>Periodic Weight %</strong> = Sum of all column weights for that interval.<br/>
              <strong>Cumulative Progress %</strong> = Running total of periodic weights, capped at 100%.</p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">6. Monthly Accomplishment</h3>
              <p className="text-muted-foreground">Columns are grouped into months (based on "Days/Month" setting):</p>
              <code className="block bg-muted px-3 py-2 rounded text-xs mt-1">Monthly Acc. % = Sum of column weights in that month</code>
              <code className="block bg-muted px-3 py-2 rounded text-xs mt-1">Monthly Acc. ₱ = Grand Total × Monthly Acc. % ÷ 100</code>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">7. S-Curve Line</h3>
              <p className="text-muted-foreground">The S-Curve uses <strong>Catmull-Rom spline interpolation</strong> through the cumulative progress points. Each point's X is a time column and Y is cumulative progress (0–100%).</p>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      {}
      {hoveredCol !== null && tooltipPos && (
        <div
          className="fixed z-[9999] pointer-events-none rounded-xl shadow-2xl text-xs backdrop-blur-sm"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
            transform: "translate(-50%, -100%)",
            minWidth: 220,
            maxWidth: 280,
            background: "hsl(var(--card) / 0.97)",
            border: "1px solid hsl(var(--border))",
          }}
        >
          {(() => {
            const data = getColTooltipData(hoveredCol);
            return (
              <div className="p-3">
                <div className="font-bold text-sm text-foreground mb-2 pb-2 border-b border-border">{data.dayRange}</div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  <div className="text-muted-foreground">Periodic Wt</div>
                  <div className="font-mono font-semibold text-foreground text-right">{(data.periodicWeight ?? 0).toFixed(2)}%</div>
                  <div className="text-muted-foreground">Cumulative</div>
                  <div className="font-mono font-semibold text-primary text-right">{(data.cumulativePct ?? 0).toFixed(2)}%</div>
                  <div className="text-muted-foreground">Cost</div>
                  <div className="font-mono font-semibold text-foreground text-right">₱{formatCurrency(data.cumulativeCostVal ?? 0)}</div>
                </div>
                {data.activeCategories.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <div className="font-semibold text-foreground mb-1">Active Categories</div>
                    {data.activeCategories.map((c, i) => (
                      <div key={i} className="text-muted-foreground pl-1 py-0.5 flex items-start gap-1.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-1 shrink-0" />
                        <span>{c}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save S-Curve Version</DialogTitle>
            <DialogDescription>
              Snapshot the current schedule (durations, intervals and date ranges) so you can revisit progress later.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Version name (e.g., Baseline, Week 4 Update)"
            value={versionName}
            onChange={(e) => setVersionName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && versionName.trim()) handleSaveVersion(); }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveVersion} disabled={!versionName.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={versionsOpen} onOpenChange={setVersionsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>S-Curve Versions</DialogTitle>
            <DialogDescription>
              Preview a saved version to see project progress at that point in time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-auto">
            {snapshots.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No versions saved yet.</p>
            ) : (
              snapshots.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 p-3 rounded-md border">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.createdAt).toLocaleString()} · {s.totalDuration} days
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => handleLoadVersion(s)}>
                      <Eye className="h-3 w-3 mr-1" /> Preview
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteVersion(s.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
