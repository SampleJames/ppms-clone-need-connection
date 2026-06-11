import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FunctionSquare, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { isValidFormula, evalFormula, FormulaContext } from "@/lib/formulas";

export const REF_COLORS = [
  { fg: "hsl(0 75% 45%)", bg: "hsl(0 75% 45% / 0.12)", ring: "hsl(0 75% 45%)" },
  { fg: "hsl(220 75% 50%)", bg: "hsl(220 75% 50% / 0.12)", ring: "hsl(220 75% 50%)" },
  { fg: "hsl(145 60% 35%)", bg: "hsl(145 60% 35% / 0.12)", ring: "hsl(145 60% 35%)" },
  { fg: "hsl(280 60% 50%)", bg: "hsl(280 60% 50% / 0.12)", ring: "hsl(280 60% 50%)" },
  { fg: "hsl(30 90% 45%)", bg: "hsl(30 90% 45% / 0.12)", ring: "hsl(30 90% 45%)" },
  { fg: "hsl(190 70% 40%)", bg: "hsl(190 70% 40% / 0.12)", ring: "hsl(190 70% 40%)" },
  { fg: "hsl(330 65% 50%)", bg: "hsl(330 65% 50% / 0.12)", ring: "hsl(330 65% 50%)" },
  { fg: "hsl(80 55% 35%)", bg: "hsl(80 55% 35% / 0.12)", ring: "hsl(80 55% 35%)" },
];

export const REF_REGEX = /\b([A-Ca-c])(\d+)(?:\.([utwrUTWR]))?\b/g;

export function extractRefs(formula: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  REF_REGEX.lastIndex = 0;
  while ((m = REF_REGEX.exec(formula))) {
    const k = `${m[1].toUpperCase()}${m[2]}${m[3] ? "." + m[3].toLowerCase() : ""}`;
    if (!seen.has(k)) { seen.add(k); out.push(k); }
  }
  return out;
}

export function ColorizedFormula({ formula, colorMap }: { formula: string; colorMap: Record<string, number> }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(REF_REGEX.source, "g");
  let i = 0;
  while ((m = re.exec(formula))) {
    if (m.index > last) parts.push(<span key={`t${i++}`}>{formula.slice(last, m.index)}</span>);
    const key = `${m[1].toUpperCase()}${m[2]}${m[3] ? "." + m[3].toLowerCase() : ""}`;
    const ci = colorMap[key];
    const c = ci !== undefined ? REF_COLORS[ci % REF_COLORS.length] : null;
    parts.push(
      <span
        key={`r${i++}`}
        className="rounded-sm font-semibold"
        style={c ? { color: c.fg, backgroundColor: c.bg, boxShadow: `0 0 0 1px ${c.bg}` } : undefined}
      >
        {m[0]}
      </span>
    );
    last = m.index + m[0].length;
  }
  if (last < formula.length) parts.push(<span key={`t${i++}`}>{formula.slice(last)}</span>);
  return <>{parts}</>;
}

export function ColorizedFormulaText({ value, className }: { value: string; className?: string }) {
  const refs = extractRefs(value);
  const map: Record<string, number> = {};
  refs.forEach((r, i) => { map[r] = i; });
  return (
    <span className={`font-mono ${className || ""}`}>
      <ColorizedFormula formula={value} colorMap={map} />
    </span>
  );
}

export interface PickerHandle {
  pickActive: string | null;
  setPickActive: (k: string | null) => void;
  insertRef: React.MutableRefObject<((token: string) => void) | null>;
  onPickClick: (ref: string, ownRef?: string) => boolean;
  refColors: Record<string, number>;
  setRefColors: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  ctx: FormulaContext;
  portalEl?: HTMLElement | null;
}

export function useFormulaPicker(ctx: FormulaContext, portalEl?: HTMLElement | null): PickerHandle {
  const [pickActive, setPickActive] = useState<string | null>(null);
  const [refColors, setRefColors] = useState<Record<string, number>>({});
  const insertRef = useRef<((token: string) => void) | null>(null);
  const onPickClick = (ref: string, ownRef?: string) => {
    if (!pickActive) return false;
    if (pickActive === `cell:${ref}`) return false;
    if (ownRef && ref === ownRef) return false;
    insertRef.current?.(ref);
    return true;
  };
  return { pickActive, setPickActive, insertRef, onPickClick, refColors, setRefColors, ctx, portalEl };
}

export function EditableInput({ value, onChange, type = "text", proMode = false, disabled = false, multiline = false, onFirstChar }: { value: string | number; onChange: (v: string) => void; type?: string; proMode?: boolean; disabled?: boolean; multiline?: boolean; onFirstChar?: (ch: string) => void }) {
  const [localValue, setLocalValue] = useState(String(value));
  const [isFocused, setIsFocused] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  if (!isFocused && String(value) !== localValue) {
    setLocalValue(String(value));
  }

  useEffect(() => {
    if (multiline && taRef.current) {
      taRef.current.style.height = "auto";
      taRef.current.style.height = `${taRef.current.scrollHeight}px`;
    }
  }, [multiline, localValue, value, isFocused]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (onFirstChar && e.key === "=") {
      e.preventDefault();
      onFirstChar("=");
      return;
    }
    if (e.key === "Enter" || e.key === "Escape") {
      e.preventDefault();
      (e.currentTarget as HTMLInputElement).blur();
      return;
    }
    if (type === "number") {
      const allowed = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Tab", "Home", "End", "Enter", "Escape"];
      if (allowed.includes(e.key)) return;
      if ((e.ctrlKey || e.metaKey) && ["a", "c", "v", "x", "z"].includes(e.key.toLowerCase())) return;
      if (!/^[0-9.]$/.test(e.key) && e.key !== "-") {
        e.preventDefault();
      }
    }
  };

  const baseClass = `text-sm focus-visible:ring-1 px-2 min-w-0 w-full ${proMode ? "border-transparent bg-transparent hover:border-border" : "border border-dashed border-primary/30 bg-background"} ${disabled ? "opacity-60 bg-muted/50 cursor-not-allowed" : ""}`;

  if (multiline) {
    return (
      <textarea
        ref={taRef}
        rows={1}
        className={`${baseClass} rounded-md leading-snug resize-none overflow-hidden py-1.5 break-words whitespace-pre-wrap`}
        value={isFocused ? localValue : String(value)}
        onFocus={() => { setIsFocused(true); setLocalValue(String(value)); }}
        onBlur={() => { setIsFocused(false); onChange(localValue); }}
        onChange={(e) => {
          if (disabled) return;
          setLocalValue(e.target.value);
          onChange(e.target.value);
        }}
        readOnly={disabled}
      />
    );
  }

  return (
    <Input
      className={`h-8 ${baseClass}`}
      type={type === "number" ? "text" : type}
      inputMode={type === "number" ? "decimal" : undefined}
      value={isFocused ? localValue : String(value)}
      onFocus={(e) => {
        setIsFocused(true);
        setLocalValue(String(value));
        if (type === "number") setTimeout(() => e.target.select(), 0);
      }}
      onBlur={() => {
        setIsFocused(false);
        if (type === "number") {
          const parsed = parseFloat(localValue);
          onChange(isNaN(parsed) ? "0" : String(parsed));
        } else {
          onChange(localValue);
        }
      }}
      onChange={(e) => {
        if (disabled) return;
        if (type === "number") {
          const v = e.target.value;
          if (v === "" || v === "-" || /^-?\d*\.?\d*$/.test(v)) {
            setLocalValue(v);
          }
        } else {
          setLocalValue(e.target.value);
          onChange(e.target.value);
        }
      }}
      onKeyDown={handleKeyDown}
      readOnly={disabled}
    />
  );
}

/**
 * FormulaCell — Excel-like cell with floating formula overlay (top of screen).
 */
export function FormulaCell({
  ref_, value, onValueChange, formula, onFormulaChange, proMode, placeholder, picker,
}: {
  ref_: string;
  value: number;
  onValueChange: (v: string) => void;
  formula: string;
  onFormulaChange: (v: string) => void;
  proMode: boolean;
  placeholder: string;
  picker: PickerHandle;
}) {
  const { pickActive, setPickActive, insertRef, refColors, setRefColors, ctx } = picker;
  const pickKey = `cell:${ref_}`;
  const isOpen = pickActive === pickKey;
  const [draft, setDraft] = useState(formula);
  const inputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number>(formula.length);

  useEffect(() => { if (!isOpen) setDraft(formula); }, [formula, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const refs = extractRefs(draft);
    const map: Record<string, number> = {};
    refs.forEach((r, i) => { map[r] = i; });
    setRefColors(map);
  }, [isOpen, draft, setRefColors]);
  useEffect(() => {
    if (!isOpen) return;
    return () => setRefColors({});
  }, [isOpen, setRefColors]);

  const pendingCaretRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    insertRef.current = (token: string) => {
      setDraft((cur) => {
        const pos = caretRef.current ?? cur.length;
        const prev = cur.slice(0, pos);
        const next = cur.slice(pos);
        const needsOp = /[\w\)]\s*$/.test(prev);
        const insert = (needsOp ? " + " : "") + token;
        const updated = prev + insert + next;
        const newPos = (prev + insert).length;
        caretRef.current = newPos;
        pendingCaretRef.current = newPos;
        return updated;
      });
    };
    return () => { if (insertRef.current) insertRef.current = null; };
  }, [isOpen, insertRef]);

  useEffect(() => {
    if (pendingCaretRef.current === null) return;
    const pos = pendingCaretRef.current;
    pendingCaretRef.current = null;
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    try { el.setSelectionRange(pos, pos); } catch { /* noop */ }
  }, [draft]);

  const valid = !draft.trim() || isValidFormula(draft);
  const hasFormula = !!formula.trim() && isValidFormula(formula);

  const open = (initial?: string) => {
    setDraft(initial ?? formula);
    setPickActive(pickKey);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      el?.focus();
      const len = (initial ?? formula).length;
      try { el?.setSelectionRange(len, len); } catch { /* noop */ }
    });
  };
  const commit = () => { onFormulaChange(draft); setPickActive(null); };
  const [confirmCancel, setConfirmCancel] = useState(false);
  const requestCancel = () => {
    if (draft !== formula) setConfirmCancel(true);
    else setPickActive(null);
  };
  const cancel = () => { setDraft(formula); setPickActive(null); setConfirmCancel(false); };
  const clear = () => { setDraft(""); onFormulaChange(""); setPickActive(null); };

  const pickableForOther = !!pickActive && !isOpen;
  const myColorIdx = refColors[ref_];
  const myColor = myColorIdx !== undefined ? REF_COLORS[myColorIdx % REF_COLORS.length] : null;
  const portalTarget = picker.portalEl ?? (typeof document !== "undefined" ? document.body : null);
  const portalClassName = picker.portalEl
    ? "sticky top-0 left-0 right-0 z-[60] bg-background border-b shadow-lg animate-in slide-in-from-top-2"
    : "fixed top-0 left-0 right-0 z-[60] bg-background border-b shadow-lg animate-in slide-in-from-top-2";

  return (
    <>
      <td
        data-ref={ref_}
        className={`px-1.5 py-1 relative ${pickableForOther ? "cursor-crosshair" : ""} ${isOpen ? "ring-2 ring-primary bg-primary/5" : ""}`}
        style={
          myColor
            ? { boxShadow: `inset 0 0 0 2px ${myColor.ring}`, backgroundColor: myColor.bg }
            : pickableForOther
            ? { boxShadow: "inset 0 0 0 1px hsl(var(--primary) / 0.4)", backgroundColor: "hsl(var(--primary) / 0.05)" }
            : undefined
        }
        onMouseDownCapture={(e) => {
          if (!pickableForOther) return;
          e.preventDefault();
          e.stopPropagation();
          picker.onPickClick(ref_);
        }}
      >
        <div className="flex items-center gap-1">
          <div className="flex-1 min-w-0">
            <EditableInput
              value={value}
              onChange={onValueChange}
              type="number"
              proMode={proMode}
              disabled={hasFormula}
              onFirstChar={(ch) => { if (ch === "=") open(""); }}
            />
          </div>
          <button
            type="button"
            title={hasFormula ? `= ${formula}` : "Add formula"}
            onClick={(e) => { e.stopPropagation(); open(); }}
            className={`shrink-0 h-5 w-5 inline-flex items-center justify-center rounded text-[10px] font-mono transition-colors ${hasFormula ? "bg-primary/15 text-primary hover:bg-primary/25" : "text-muted-foreground/60 hover:text-foreground hover:bg-accent"}`}
          >
            fx
          </button>
        </div>
      </td>
      {isOpen && portalTarget && createPortal(
        <div
          data-formula-portal="true"
          className={portalClassName}
          onMouseDown={(e) => { e.stopPropagation(); }}
        >
          <div className="max-w-[1400px] mx-auto px-4 py-2.5 flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm font-semibold shrink-0">
              <FunctionSquare className="h-4 w-4 text-primary" />
              <span className="font-mono text-primary">{ref_}</span>
            </div>
            <span className="font-mono text-base text-muted-foreground shrink-0">=</span>
            <div className="relative flex-1">
              <Input
                ref={inputRef}
                className={`h-9 text-sm font-mono px-3 ${valid ? "" : "border-destructive"} ${draft ? "text-transparent caret-foreground selection:bg-primary/30 selection:text-transparent" : ""}`}
                value={draft}
                onChange={(e) => { setDraft(e.target.value); caretRef.current = e.target.selectionStart ?? e.target.value.length; }}
                onSelect={(e) => { caretRef.current = (e.target as HTMLInputElement).selectionStart ?? draft.length; }}
                onKeyUp={(e) => { caretRef.current = (e.target as HTMLInputElement).selectionStart ?? draft.length; }}
                onClick={(e) => { caretRef.current = (e.target as HTMLInputElement).selectionStart ?? draft.length; }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); commit(); }
                  else if (e.key === "Escape") { e.preventDefault(); requestCancel(); }
                }}
                placeholder={placeholder}
                autoFocus
              />
              {draft && (
                <div className="pointer-events-none absolute inset-0 px-3 flex items-center text-sm font-mono whitespace-pre overflow-hidden">
                  <ColorizedFormula formula={draft} colorMap={refColors} />
                </div>
              )}
            </div>
            {valid && draft.trim() && (() => {
              const r = evalFormula(draft, ctx);
              return (
                <span className="text-xs text-muted-foreground shrink-0 hidden md:inline">
                  = <span className="font-mono text-foreground">{isNaN(r) ? "—" : r.toLocaleString("en-PH", { maximumFractionDigits: 4 })}</span>
                </span>
              );
            })()}
            {!valid && <span className="text-xs text-destructive shrink-0">Invalid</span>}
            <div className="flex items-center gap-1 shrink-0">
              <Button size="sm" variant="ghost" className="h-8" onClick={requestCancel} title="Cancel (Esc)">
                <X className="h-4 w-4" />
              </Button>
              {hasFormula && (
                <Button size="sm" variant="ghost" className="h-8 text-destructive hover:text-destructive" onClick={clear} title="Clear formula">
                  Clear
                </Button>
              )}
              <Button size="sm" className="h-8" onClick={commit} title="Save (Enter)">Save</Button>
            </div>
          </div>
          <div className="max-w-[1400px] mx-auto px-4 pb-2 text-[11px] text-muted-foreground">
            Click any cell to insert its reference (e.g. <span className="font-mono">A1</span>, <span className="font-mono">A1.u</span>, <span className="font-mono">A1.t</span>) • use <span className="font-mono">qty</span> for parent quantity • <kbd className="px-1 rounded bg-muted">Enter</kbd> to save, <kbd className="px-1 rounded bg-muted">Esc</kbd> to cancel
          </div>
        </div>,
        portalTarget
      )}
      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to this formula. Are you sure you want to cancel?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={cancel}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function PickCell({ ref_, picker, className, children }: {
  ref_: string;
  picker: PickerHandle;
  className?: string;
  children: React.ReactNode;
}) {
  const active = !!picker.pickActive;
  const ci = picker.refColors?.[ref_];
  const c = ci !== undefined ? REF_COLORS[ci % REF_COLORS.length] : null;
  return (
    <td
      data-ref={ref_}
      className={`px-1.5 py-1 ${className || ""} ${active && !c ? "cursor-crosshair" : ""}`}
      style={
        c
          ? { boxShadow: `inset 0 0 0 2px ${c.ring}`, backgroundColor: c.bg, color: c.fg }
          : active
          ? { boxShadow: "inset 0 0 0 1px hsl(var(--primary) / 0.4)", backgroundColor: "hsl(var(--primary) / 0.05)" }
          : undefined
      }
      onMouseDownCapture={(e) => {
        if (!active) return;
        e.preventDefault();
        e.stopPropagation();
        picker.onPickClick(ref_);
      }}
    >
      {children}
    </td>
  );
}

export function buildFormulaCtx(
  qty: number,
  materials: Array<{ quantity: number; unitCost: number }>,
  labor: Array<{ manDays: number; wageRate: number }>,
  equipment: Array<{ period: number; rate: number }>,
): FormulaContext {
  const refs: Record<string, number> = {};
  materials.forEach((m, i) => {
    refs[`A${i + 1}`] = m.quantity;
    refs[`A${i + 1}.u`] = m.unitCost;
    refs[`A${i + 1}.t`] = m.quantity * m.unitCost;
  });
  labor.forEach((l, i) => {
    refs[`B${i + 1}`] = l.manDays;
    refs[`B${i + 1}.w`] = l.wageRate;
    refs[`B${i + 1}.t`] = l.manDays * l.wageRate;
  });
  equipment.forEach((e, i) => {
    refs[`C${i + 1}`] = e.period;
    refs[`C${i + 1}.r`] = e.rate;
    refs[`C${i + 1}.t`] = e.period * e.rate;
  });
  return { qty, refs };
}