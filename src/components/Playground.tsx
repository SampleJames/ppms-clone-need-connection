import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Trash2, Grid3X3, ChevronDown, ArrowDownToLine, FunctionSquare, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ColorizedFormulaText, SHEET_REF_REGEX, REF_COLORS } from "@/components/ui/colorized-formula-input";

const STORAGE_KEY = "costmgr_playgrounds";
const COLS = 26;
const DEFAULT_ROWS = 50;

interface CellData {
  value: string;
  computed?: string;
}

interface Sheet {
  id: string;
  name: string;
  cells: Record<string, CellData>;
  rowCount: number;
}

interface PlaygroundData {
  id: string;
  name: string;
  sheets: Sheet[];
  activeSheet: number;
  createdAt: string;
}

function colLabel(i: number): string {
  return String.fromCharCode(65 + i);
}

function cellKey(col: number, row: number): string {
  return `${colLabel(col)}${row + 1}`;
}

function parseCellRef(ref: string): { col: number; row: number } | null {
  const match = ref.match(/^([A-Z])(\d+)$/i);
  if (!match) return null;
  return { col: match[1].toUpperCase().charCodeAt(0) - 65, row: parseInt(match[2]) - 1 };
}

function adjustFormulaRow(formula: string, rowOffset: number): string {
  return formula.replace(/([A-Z])(\d+)/gi, (_, col, row) => {
    return `${col.toUpperCase()}${parseInt(row) + rowOffset}`;
  });
}

function splitArgs(str: string): string[] {
  const args: string[] = [];
  let depth = 0, current = "";
  for (const ch of str) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) { args.push(current); current = ""; }
    else current += ch;
  }
  if (current) args.push(current);
  return args;
}

function resolveRefs(expr: string, cells: Record<string, CellData>, visited: Set<string>): string {
  return expr.replace(/[A-Z]\d+/gi, (ref) => {
    const key = ref.toUpperCase();
    const val = getCellValue(key, cells, new Set(visited));
    const num = parseFloat(val);
    return isNaN(num) ? "0" : num.toString();
  });
}

function evalSimple(expr: string): string {
  const sanitized = expr.trim().replace(/[^0-9+\-*/().\s]/g, "");
  try { return String(new Function(`return (${sanitized})`)()) } catch { return "0"; }
}

function parseRange(rangeStr: string, cells: Record<string, CellData>, visited: Set<string>): number[] {
  const parts = rangeStr.split(":");
  if (parts.length !== 2) return [];
  const start = parseCellRef(parts[0].trim());
  const end = parseCellRef(parts[1].trim());
  if (!start || !end) return [];
  const values: number[] = [];
  const c1 = Math.min(start.col, end.col), c2 = Math.max(start.col, end.col);
  const r1 = Math.min(start.row, end.row), r2 = Math.max(start.row, end.row);
  for (let c = c1; c <= c2; c++) {
    for (let r = r1; r <= r2; r++) {
      const key = cellKey(c, r);
      const val = getCellValue(key, cells, new Set(visited));
      const num = parseFloat(val);
      if (!isNaN(num)) values.push(num);
    }
  }
  return values;
}

function evaluateFormula(formula: string, cells: Record<string, CellData>, visited: Set<string> = new Set()): string {
  const expr = formula.startsWith("=") ? formula.slice(1) : formula;

  
  const funcMatch = expr.match(/^(\w+)\((.+)\)$/i);
  if (funcMatch) {
    const funcName = funcMatch[1].toUpperCase();
    const args = funcMatch[2];

    
    const rangeMatch = args.match(/^([A-Z]\d+):([A-Z]\d+)$/i);
    if (rangeMatch) {
      const values = parseRange(`${rangeMatch[1]}:${rangeMatch[2]}`, cells, visited);
      switch (funcName) {
        case "SUM": return values.reduce((a, b) => a + b, 0).toString();
        case "AVERAGE": return values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toString() : "0";
        case "MIN": return values.length > 0 ? Math.min(...values).toString() : "0";
        case "MAX": return values.length > 0 ? Math.max(...values).toString() : "0";
        case "COUNT": return values.length.toString();
        case "COUNTA": {
          
          const start = parseCellRef(rangeMatch[1]);
          const end = parseCellRef(rangeMatch[2]);
          if (!start || !end) return "#REF!";
          let count = 0;
          const c1 = Math.min(start.col, end.col), c2 = Math.max(start.col, end.col);
          const r1 = Math.min(start.row, end.row), r2 = Math.max(start.row, end.row);
          for (let c = c1; c <= c2; c++) {
            for (let r = r1; r <= r2; r++) {
              const val = getCellValue(cellKey(c, r), cells, new Set(visited));
              if (val.trim() !== "") count++;
            }
          }
          return count.toString();
        }
      }
    }

    // IF(condition, trueVal, falseVal)
    if (funcName === "IF") {
      const ifParts = splitArgs(args);
      if (ifParts.length !== 3) return "#ERR!";
      const condStr = resolveRefs(ifParts[0], cells, visited);
      
      const condMatch = condStr.match(/^(.+?)(>=|<=|<>|!=|>|<|=)(.+)$/);
      if (!condMatch) return "#ERR!";
      const left = parseFloat(evalSimple(condMatch[1]));
      const right = parseFloat(evalSimple(condMatch[3]));
      if (isNaN(left) || isNaN(right)) return "#ERR!";
      let result = false;
      switch (condMatch[2]) {
        case ">": result = left > right; break;
        case "<": result = left < right; break;
        case ">=": result = left >= right; break;
        case "<=": result = left <= right; break;
        case "=": result = left === right; break;
        case "<>": case "!=": result = left !== right; break;
      }
      const chosen = result ? ifParts[1] : ifParts[2];
      const resolved = resolveRefs(chosen.trim(), cells, visited);
      const num = parseFloat(resolved);
      return isNaN(num) ? resolved.replace(/^"|"$/g, "") : num.toString();
    }

    // ROUND(value, decimals)
    if (funcName === "ROUND") {
      const roundParts = splitArgs(args);
      if (roundParts.length !== 2) return "#ERR!";
      const val = parseFloat(evaluateFormula("=" + roundParts[0].trim(), cells, new Set(visited)));
      const dec = parseInt(roundParts[1].trim());
      if (isNaN(val) || isNaN(dec)) return "#ERR!";
      return val.toFixed(dec);
    }

    
    if (funcName === "ABS") {
      const val = parseFloat(evaluateFormula("=" + args.trim(), cells, new Set(visited)));
      if (isNaN(val)) return "#ERR!";
      return Math.abs(val).toString();
    }

    
    if (funcName === "POWER") {
      const parts = splitArgs(args);
      if (parts.length !== 2) return "#ERR!";
      const base = parseFloat(evaluateFormula("=" + parts[0].trim(), cells, new Set(visited)));
      const exp = parseFloat(evaluateFormula("=" + parts[1].trim(), cells, new Set(visited)));
      if (isNaN(base) || isNaN(exp)) return "#ERR!";
      return Math.pow(base, exp).toString();
    }

    
    if (funcName === "SQRT") {
      const val = parseFloat(evaluateFormula("=" + args.trim(), cells, new Set(visited)));
      if (isNaN(val)) return "#ERR!";
      return Math.sqrt(val).toString();
    }
  }

  const replaced = expr.replace(/[A-Z]\d+/gi, (ref) => {
    const key = ref.toUpperCase();
    const val = getCellValue(key, cells, visited);
    const num = parseFloat(val);
    return isNaN(num) ? "0" : num.toString();
  });

  try {
    let processed = replaced.replace(/(\d+(?:\.\d+)?)%(\d+(?:\.\d+)?)/g, "($1/100*$2)");
    processed = processed.replace(/(\d+(?:\.\d+)?)%/g, "($1/100)");
    const sanitized = processed.replace(/[^0-9+\-*/().\s]/g, "");
    if (sanitized !== processed) return "#ERR!";
    const result = new Function(`return (${sanitized})`)();
    if (typeof result === "number") {
      if (!isFinite(result)) return "#DIV/0!";
      return Number.isInteger(result) ? result.toString() : result.toFixed(4).replace(/\.?0+$/, "");
    }
    return String(result);
  } catch {
    return "#ERR!";
  }
}

function getCellValue(key: string, cells: Record<string, CellData>, visited: Set<string> = new Set()): string {
  if (visited.has(key)) return "#CIRC!";
  const cell = cells[key];
  if (!cell || !cell.value) return "";
  if (cell.value.startsWith("=")) {
    visited.add(key);
    return evaluateFormula(cell.value, cells, visited);
  }
  return cell.value;
}

function computeAll(cells: Record<string, CellData>): Record<string, CellData> {
  const result: Record<string, CellData> = {};
  for (const [key, cell] of Object.entries(cells)) {
    if (cell.value.startsWith("=")) {
      result[key] = { ...cell, computed: evaluateFormula(cell.value, cells) };
    } else {
      result[key] = { ...cell, computed: cell.value };
    }
  }
  return result;
}

function loadPlaygrounds(): PlaygroundData[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function savePlaygrounds(playgrounds: PlaygroundData[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(playgrounds));
}

interface PlaygroundProps {
  compact?: boolean;
}

/** Inline colorized overlay matching DUPA's FormulaCell — NO horizontal padding so the
 *  overlay text width matches the underlying input character-for-character (caret stays aligned). */
function ColorizedOverlay({ formula }: { formula: string }) {
  const re = new RegExp(SHEET_REF_REGEX.source, "gi");
  const colorMap: Record<string, number> = {};
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(formula))) {
    const k = m[0].toUpperCase();
    if (!(k in colorMap)) colorMap[k] = i++;
  }
  const parts: React.ReactNode[] = [];
  re.lastIndex = 0;
  let last = 0; let j = 0;
  while ((m = re.exec(formula))) {
    if (m.index > last) parts.push(<span key={`t${j++}`}>{formula.slice(last, m.index)}</span>);
    const ci = colorMap[m[0].toUpperCase()];
    const c = REF_COLORS[ci % REF_COLORS.length];
    parts.push(
      <span
        key={`r${j++}`}
        className="rounded-sm font-semibold"
        style={{ color: c.fg, backgroundColor: c.bg, boxShadow: `0 0 0 1px ${c.bg}` }}
      >
        {m[0]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < formula.length) parts.push(<span key={`t${j++}`}>{formula.slice(last)}</span>);
  return <>{parts}</>;
}

export default function Playground({ compact }: PlaygroundProps) {
  const [playgrounds, setPlaygrounds] = useState<PlaygroundData[]>(loadPlaygrounds);
  const [activeId, setActiveId] = useState<string | null>(playgrounds[0]?.id ?? null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isFormulaMode, setIsFormulaMode] = useState(false);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedRange, setSelectedRange] = useState<{ start: string; end: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const floatingInputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number>(0);
  const pendingCaretRef = useRef<number | null>(null);
  const formulaModeRef = useRef(false);
  const editingCellRef = useRef<string | null>(null);
  const editValueRef = useRef("");

  const pg = playgrounds.find((p) => p.id === activeId) ?? null;
  const sheet = pg ? pg.sheets[pg.activeSheet] : null;

  // While editing a formula, build a token->color-index map for inline highlighting
  const formulaRefColors: Record<string, number> = {};
  if (editingCell && editValue.startsWith("=") && isFormulaMode) {
    const re = new RegExp(SHEET_REF_REGEX.source, "gi");
    let m: RegExpExecArray | null;
    let i = 0;
    while ((m = re.exec(editValue))) {
      const k = m[0].toUpperCase();
      if (!(k in formulaRefColors) && k !== editingCell) {
        formulaRefColors[k] = i++;
      }
    }
  }

  const persist = useCallback((updated: PlaygroundData[]) => {
    setPlaygrounds(updated);
    savePlaygrounds(updated);
  }, []);

  const updateSheet = useCallback((updatedSheet: Sheet) => {
    if (!pg) return;
    const updatedSheets = pg.sheets.map((s) => (s.id === updatedSheet.id ? updatedSheet : s));
    const updated = playgrounds.map((p) => (p.id === pg.id ? { ...p, sheets: updatedSheets } : p));
    persist(updated);
  }, [pg, playgrounds, persist]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const newPg: PlaygroundData = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      sheets: [{
        id: crypto.randomUUID(),
        name: "Sheet 1",
        cells: {},
        rowCount: DEFAULT_ROWS,
      }],
      activeSheet: 0,
      createdAt: new Date().toISOString(),
    };
    const updated = [...playgrounds, newPg];
    persist(updated);
    setActiveId(newPg.id);
    setNewName("");
    setNewDialogOpen(false);
    toast({ title: "Playground created" });
  };

  const handleDelete = (id: string) => {
    const updated = playgrounds.filter((p) => p.id !== id);
    persist(updated);
    if (activeId === id) setActiveId(updated[0]?.id ?? null);
    toast({ title: "Playground deleted" });
  };

  const startEdit = (key: string, shiftKey = false) => {
    if (!sheet) return;

    
    if (shiftKey && editingCellRef.current) {
      commitEdit();
      setSelectedRange({ start: editingCellRef.current, end: key });
      return;
    }

    
    if (editingCellRef.current && formulaModeRef.current && key !== editingCellRef.current) {
      const cur = editValueRef.current;
      const pos = caretRef.current ?? cur.length;
      const prev = cur.slice(0, pos);
      const next = cur.slice(pos);
      const needsOp = /[\w\)]\s*$/.test(prev);
      const insert = (needsOp ? "+" : "") + key;
      const newVal = prev + insert + next;
      const newPos = (prev + insert).length;
      setEditValue(newVal);
      editValueRef.current = newVal;
      caretRef.current = newPos;
      pendingCaretRef.current = newPos;
      setTimeout(() => {
        const el = floatingInputRef.current ?? inputRef.current;
        el?.focus();
        try { el?.setSelectionRange(newPos, newPos); } catch { /* noop */ }
      }, 0);
      return;
    }

    setEditingCell(key);
    editingCellRef.current = key;
    setSelectedRange(null);
    const val = sheet.cells[key]?.value ?? "";
    setEditValue(val);
    editValueRef.current = val;
    const fm = val.startsWith("=");
    setIsFormulaMode(fm);
    formulaModeRef.current = fm;
    caretRef.current = val.length;
    setTimeout(() => {
      const el = fm ? floatingInputRef.current : inputRef.current;
      el?.focus();
      try { el?.setSelectionRange(val.length, val.length); } catch { /* noop */ }
    }, 0);
  };

  const commitEdit = () => {
    if (!sheet || !editingCellRef.current) return;
    const currentCell = editingCellRef.current;
    const currentValue = editValueRef.current;
    const newCells = { ...sheet.cells };
    if (currentValue.trim()) {
      newCells[currentCell] = { value: currentValue };
    } else {
      delete newCells[currentCell];
    }
    const computed = computeAll(newCells);
    updateSheet({ ...sheet, cells: computed });
    setEditingCell(null);
    editingCellRef.current = null;
    setEditValue("");
    editValueRef.current = "";
    setIsFormulaMode(false);
    formulaModeRef.current = false;
  };

  const handleEditChange = (val: string) => {
    setEditValue(val);
    editValueRef.current = val;
    const fm = val.startsWith("=");
    setIsFormulaMode(fm);
    formulaModeRef.current = fm;
  };

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
    editingCellRef.current = null;
    setEditValue("");
    editValueRef.current = "";
    setIsFormulaMode(false);
    formulaModeRef.current = false;
  }, []);

  // When entering formula mode, focus the floating input and restore caret
  useEffect(() => {
    if (!isFormulaMode || !editingCell) return;
    const el = floatingInputRef.current;
    if (!el) return;
    el.focus();
    const pos = pendingCaretRef.current ?? caretRef.current ?? editValue.length;
    pendingCaretRef.current = null;
    try { el.setSelectionRange(pos, pos); } catch { /* noop */ }
  }, [isFormulaMode, editingCell, editValue]);

  const fillDown = useCallback(() => {
    if (!sheet || !selectedRange) return;
    const start = parseCellRef(selectedRange.start);
    const end = parseCellRef(selectedRange.end);
    if (!start || !end) return;
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    if (minRow === maxRow) return;

    const newCells = { ...sheet.cells };
    for (let col = minCol; col <= maxCol; col++) {
      const sourceKey = cellKey(col, minRow);
      const sourceValue = newCells[sourceKey]?.value || "";
      for (let row = minRow + 1; row <= maxRow; row++) {
        const targetKey = cellKey(col, row);
        const rowOffset = row - minRow;
        const adjustedValue = sourceValue.startsWith("=")
          ? adjustFormulaRow(sourceValue, rowOffset)
          : sourceValue;
        newCells[targetKey] = { value: adjustedValue };
      }
    }

    const computed = computeAll(newCells);
    updateSheet({ ...sheet, cells: computed });
    setSelectedRange(null);
    toast({ title: "Filled down" });
  }, [sheet, selectedRange, updateSheet]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      commitEdit();
      if (editingCell) {
        const ref = parseCellRef(editingCell);
        if (ref && ref.row + 1 < (sheet?.rowCount ?? DEFAULT_ROWS)) {
          startEdit(cellKey(ref.col, ref.row + 1));
        }
      }
    } else if (e.key === "Escape") {
      setEditingCell(null);
      editingCellRef.current = null;
      setEditValue("");
      editValueRef.current = "";
      setSelectedRange(null);
    } else if (e.key === "Tab") {
      e.preventDefault();
      commitEdit();
      if (editingCell) {
        const ref = parseCellRef(editingCell);
        if (ref && ref.col + 1 < COLS) {
          startEdit(cellKey(ref.col + 1, ref.row));
        }
      }
    } else if (e.key === "d" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      fillDown();
    }
  };

  const isCellInRange = (key: string): boolean => {
    if (!selectedRange || !selectedRange.start || !selectedRange.end) return false;
    const cell = parseCellRef(key);
    const start = parseCellRef(selectedRange.start);
    const end = parseCellRef(selectedRange.end);
    if (!cell || !start || !end) return false;
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    return cell.row >= minRow && cell.row <= maxRow && cell.col >= minCol && cell.col <= maxCol;
  };

  const visibleCols = compact ? 10 : 16;
  const visibleRows = sheet?.rowCount ?? DEFAULT_ROWS;

  return (
    <div className={compact ? "max-w-[80%] mx-auto" : ""}>
      <Card className="mt-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Grid3X3 className="h-5 w-5 text-primary" />
              Playground
            </CardTitle>
            <div className="flex items-center gap-2">
              {playgrounds.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 max-w-[200px] min-w-0" title={pg?.name}>
                      <span className="truncate min-w-0 flex-1 text-left">{pg?.name ?? "Select"}</span>
                      <ChevronDown className="h-3 w-3 shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="max-w-[280px]">
                    {playgrounds.map((p) => (
                      <DropdownMenuItem key={p.id} className="flex items-center justify-between gap-2 min-w-0" onClick={() => setActiveId(p.id)}>
                        <span className="truncate min-w-0 flex-1" title={p.name}>{p.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 shrink-0"
                          onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button size="sm" onClick={() => setNewDialogOpen(true)} className="gap-1">
                <Plus className="h-4 w-4" /> New
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!sheet ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Grid3X3 className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-lg font-medium">No playground selected</p>
              <p className="text-sm mt-1">Create a new playground to start computing.</p>
            </div>
          ) : (
            <>
              {}
              {(() => null)()}
              {}
              <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-muted/30 min-h-[32px]">
                {editingCell ? (
                  <>
                    <span className="text-xs font-mono font-semibold text-primary w-8">{editingCell}</span>
                    <span className="text-xs truncate flex-1">
                      {editValue.startsWith("=") ? (
                        <ColorizedFormulaText value={editValue} refRegex={SHEET_REF_REGEX} className="text-xs" />
                      ) : (
                        <span className="font-mono text-muted-foreground">{editValue}</span>
                      )}
                    </span>
                  </>
                ) : selectedRange ? (
                  <>
                    <span className="text-xs font-mono font-semibold text-primary">{selectedRange.start}:{selectedRange.end}</span>
                    <Button size="sm" variant="outline" className="h-6 text-xs gap-1 ml-2" onClick={fillDown}>
                      <ArrowDownToLine className="h-3 w-3" /> Fill Down
                    </Button>
                    <span className="text-xs text-muted-foreground ml-2">(or Ctrl+D)</span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">Click a cell to edit · Shift+click to select range · Ctrl+D to fill down</span>
                )}
              </div>
              <div className="overflow-auto max-h-[65vh]">
                <table className="border-collapse w-max min-w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-muted">
                      <th className="w-10 min-w-[40px] border border-border bg-muted text-center text-[10px] font-medium text-muted-foreground p-0" />
                      {Array.from({ length: visibleCols }, (_, i) => (
                        <th key={i} className="min-w-[80px] w-[80px] border border-border bg-muted text-center text-[10px] font-medium text-muted-foreground p-1">
                          {colLabel(i)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: visibleRows }, (_, row) => (
                      <tr key={row}>
                        <td className="border border-border bg-muted text-center text-[10px] font-medium text-muted-foreground p-0 select-none">
                          {row + 1}
                        </td>
                        {Array.from({ length: visibleCols }, (_, col) => {
                          const key = cellKey(col, row);
                          const cell = sheet.cells[key];
                          const isEditing = editingCell === key;
                          const display = cell?.computed ?? cell?.value ?? "";
                          const isFormula = cell?.value?.startsWith("=");
                          const inRange = isCellInRange(key);
                          const refColorIdx = formulaRefColors[key];
                          const refColor = refColorIdx !== undefined ? REF_COLORS[refColorIdx % REF_COLORS.length] : null;

                          return (
                            <td
                              key={key}
                              data-ref={key}
                              className={`border border-border p-0 relative ${inRange && !refColor ? "bg-primary/10 ring-1 ring-inset ring-primary/30" : ""}`}
                              style={refColor ? { boxShadow: `inset 0 0 0 2px ${refColor.fg}`, backgroundColor: refColor.bg } : undefined}
                              onMouseDown={(e) => {
                                if (formulaModeRef.current && editingCellRef.current && key !== editingCellRef.current) {
                                  e.preventDefault();
                                }
                              }}
                              onClick={(e) => startEdit(key, e.shiftKey)}
                            >
                              {isEditing && !isFormulaMode ? (
                                <div className="relative">
                                  <input
                                    ref={inputRef}
                                    className="w-full h-full px-1 py-0.5 text-xs font-mono border-none outline-none bg-primary/5 focus:bg-primary/10"
                                    value={editValue}
                                    onChange={(e) => handleEditChange(e.target.value)}
                                    onBlur={(e) => {
                                      if (formulaModeRef.current) return;
                                      const next = e.relatedTarget as HTMLElement | null;
                                      if (next?.closest("[data-pg-formula-bar]")) return;
                                      commitEdit();
                                    }}
                                    onKeyDown={handleKeyDown}
                                    style={{ minHeight: "22px" }}
                                  />
                                </div>
                              ) : isEditing && isFormulaMode ? (
                                <div className="px-1 py-0.5 text-xs font-mono min-h-[22px] truncate bg-primary/10 ring-2 ring-inset ring-primary">
                                  <ColorizedFormulaText value={editValue} refRegex={SHEET_REF_REGEX} />
                                </div>
                              ) : (
                                <div
                                  className={`px-1 py-0.5 text-xs truncate min-h-[22px] cursor-cell ${
                                    isFormula ? "text-primary font-medium" : "text-foreground"
                                  } ${typeof display === "string" && display.startsWith("#") ? "text-destructive" : ""}`}
                                >
                                  {display}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {}
      {editingCell && isFormulaMode && sheet && typeof document !== "undefined" && createPortal(
        (() => {
          const draft = editValue;
          const livePreview = draft.length > 1 ? evaluateFormula(draft, sheet.cells) : "";
          const isErr = livePreview.startsWith("#");
          const valid = draft === "=" || (draft.startsWith("=") && !isErr);
          return (
            <div
              data-pg-formula-bar="true"
              className="fixed top-0 left-0 right-0 z-[60] bg-background border-b shadow-lg animate-in slide-in-from-top-2"
              onMouseDown={(e) => { e.stopPropagation(); }}
            >
              <div className="max-w-[1400px] mx-auto px-4 py-2.5 flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-sm font-semibold shrink-0">
                  <FunctionSquare className="h-4 w-4 text-primary" />
                  <span className="font-mono text-primary">{editingCell}</span>
                </div>
                <span className="font-mono text-base text-muted-foreground shrink-0">=</span>
                <div className="relative flex-1 min-w-0">
                  <Input
                    ref={floatingInputRef}
                    className={`h-9 text-sm font-mono px-3 ${valid ? "" : "border-destructive"} ${draft.length > 1 ? "text-transparent caret-foreground selection:bg-primary/30 selection:text-transparent" : ""}`}
                    value={draft.startsWith("=") ? draft.slice(1) : draft}
                    onChange={(e) => {
                      const v = "=" + e.target.value;
                      handleEditChange(v);
                      caretRef.current = (e.target.selectionStart ?? e.target.value.length) + 1;
                    }}
                    onSelect={(e) => { caretRef.current = ((e.target as HTMLInputElement).selectionStart ?? 0) + 1; }}
                    onKeyUp={(e) => { caretRef.current = ((e.target as HTMLInputElement).selectionStart ?? 0) + 1; }}
                    onClick={(e) => { caretRef.current = ((e.target as HTMLInputElement).selectionStart ?? 0) + 1; }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); commitEdit(); }
                      else if (e.key === "Escape") { e.preventDefault(); cancelEdit(); }
                    }}
                    placeholder="e.g. SUM(A1:A5) * 1.12"
                    autoFocus
                  />
                  {draft.length > 1 && (
                    <div className="pointer-events-none absolute inset-0 px-3 flex items-center text-sm font-mono whitespace-pre overflow-hidden">
                      <ColorizedOverlay formula={draft.slice(1)} />
                    </div>
                  )}
                </div>
                {valid && draft.length > 1 && (
                  <span className="text-xs text-muted-foreground shrink-0 hidden md:inline">
                    = <span className="font-mono text-foreground">{livePreview || "—"}</span>
                  </span>
                )}
                {!valid && <span className="text-xs text-destructive shrink-0">{livePreview}</span>}
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="h-8" onClick={cancelEdit} title="Cancel (Esc)">
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-destructive hover:text-destructive"
                    onClick={() => { handleEditChange(""); setTimeout(() => commitEdit(), 0); }}
                    title="Clear formula"
                  >
                    Clear
                  </Button>
                  <Button size="sm" className="h-8" onClick={commitEdit} title="Save (Enter)">Save</Button>
                </div>
              </div>
              <div className="max-w-[1400px] mx-auto px-4 pb-2 text-[11px] text-muted-foreground">
                Click any cell to insert its reference (e.g. <span className="font-mono">A1</span>, <span className="font-mono">B2:B10</span>) • Functions: <span className="font-mono">SUM, AVERAGE, MIN, MAX, COUNT, COUNTA, IF, ROUND, ABS, POWER, SQRT</span> • <kbd className="px-1 rounded bg-muted">Enter</kbd> save, <kbd className="px-1 rounded bg-muted">Esc</kbd> cancel
              </div>
            </div>
          );
        })(),
        document.body
      )}

      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Playground</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Playground name (e.g., Beam Calculation)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
