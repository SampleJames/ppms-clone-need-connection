import { forwardRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const REF_COLORS = [
  { fg: "hsl(0 75% 45%)", bg: "hsl(0 75% 45% / 0.12)" },
  { fg: "hsl(220 75% 50%)", bg: "hsl(220 75% 50% / 0.12)" },
  { fg: "hsl(145 60% 35%)", bg: "hsl(145 60% 35% / 0.12)" },
  { fg: "hsl(280 60% 50%)", bg: "hsl(280 60% 50% / 0.12)" },
  { fg: "hsl(30 90% 45%)", bg: "hsl(30 90% 45% / 0.12)" },
  { fg: "hsl(190 70% 40%)", bg: "hsl(190 70% 40% / 0.12)" },
  { fg: "hsl(330 65% 50%)", bg: "hsl(330 65% 50% / 0.12)" },
  { fg: "hsl(80 55% 35%)", bg: "hsl(80 55% 35% / 0.12)" },
];

export const DUPA_REF_REGEX = /\b([A-Ca-c])(\d+)(?:\.([utwrUTWR]))?\b/g;
export const SHEET_REF_REGEX = /\b([A-Z]+)(\d+)\b/gi;

export function ColorizedFormulaText({
  value, refRegex = DUPA_REF_REGEX, className,
}: { value: string; refRegex?: RegExp; className?: string }) {
  const colorMap: Record<string, number> = {};
  const re = new RegExp(refRegex.source, refRegex.flags.includes("g") ? refRegex.flags : refRegex.flags + "g");
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(value))) {
    const k = m[0].toUpperCase();
    if (!(k in colorMap)) colorMap[k] = i++;
  }
  const parts: React.ReactNode[] = [];
  re.lastIndex = 0;
  let last = 0; let j = 0;
  while ((m = re.exec(value))) {
    if (m.index > last) parts.push(<span key={`t${j++}`}>{value.slice(last, m.index)}</span>);
    const ci = colorMap[m[0].toUpperCase()];
    const c = ci !== undefined ? REF_COLORS[ci % REF_COLORS.length] : null;
    parts.push(
      <span
        key={`r${j++}`}
        className="rounded-sm font-semibold px-0.5"
        style={c ? { color: c.fg, backgroundColor: c.bg } : undefined}
      >{m[0]}</span>,
    );
    last = m.index + m[0].length;
  }
  if (last < value.length) parts.push(<span key={`t${j++}`}>{value.slice(last)}</span>);
  return <span className={cn("font-mono", className)}>{parts}</span>;
}

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: string;
  onChange: (v: string) => void;
    refRegex?: RegExp;
  invalid?: boolean;
  inputClassName?: string;
}

export const ColorizedFormulaInput = forwardRef<HTMLInputElement, Props>(function ColorizedFormulaInput(
  { value, onChange, refRegex = DUPA_REF_REGEX, invalid, className, inputClassName, ...rest },
  ref,
) {
  const colorMap = useMemo(() => {
    const map: Record<string, number> = {};
    const re = new RegExp(refRegex.source, refRegex.flags.includes("g") ? refRegex.flags : refRegex.flags + "g");
    let m: RegExpExecArray | null;
    let i = 0;
    while ((m = re.exec(value))) {
      const k = m[0].toUpperCase();
      if (!(k in map)) { map[k] = i++; }
    }
    return map;
  }, [value, refRegex]);

  const parts = useMemo(() => {
    const out: React.ReactNode[] = [];
    const re = new RegExp(refRegex.source, refRegex.flags.includes("g") ? refRegex.flags : refRegex.flags + "g");
    let last = 0; let m: RegExpExecArray | null; let i = 0;
    while ((m = re.exec(value))) {
      if (m.index > last) out.push(<span key={`t${i++}`}>{value.slice(last, m.index)}</span>);
      const ci = colorMap[m[0].toUpperCase()];
      const c = ci !== undefined ? REF_COLORS[ci % REF_COLORS.length] : null;
      out.push(
        <span
          key={`r${i++}`}
          className="rounded-sm font-semibold"
          style={c ? { color: c.fg, backgroundColor: c.bg, boxShadow: `0 0 0 1px ${c.bg}` } : undefined}
        >
          {m[0]}
        </span>,
      );
      last = m.index + m[0].length;
    }
    if (last < value.length) out.push(<span key={`t${i++}`}>{value.slice(last)}</span>);
    return out;
  }, [value, colorMap, refRegex]);

  return (
    <div className={cn("relative font-mono", className, inputClassName)}>
      <Input
        ref={ref}
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "font-mono w-full",
          value ? "text-transparent caret-foreground selection:bg-primary/30 selection:text-transparent" : "",
          invalid ? "border-destructive" : "",
          inputClassName,
        )}
      />
      {value && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center whitespace-pre overflow-hidden px-3"
        >
          {parts}
        </div>
      )}
    </div>
  );
});
