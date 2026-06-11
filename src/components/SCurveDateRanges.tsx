import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Trash2, CalendarDays } from "lucide-react";

export interface DateRange {
  from: number;
  to: number;
}

interface Props {
  ranges: DateRange[];
  onChange: (ranges: DateRange[]) => void;
  maxDuration: number;
}

function RangeIntInput({ value, onCommit, max, className }: { value: number; onCommit: (n: number) => void; max: number; className?: string }) {
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
        const clamped = isNaN(parsed) ? 0 : Math.max(0, Math.min(max, parsed));
        setLocal(String(clamped));
        onCommit(clamped);
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

export default function SCurveDateRanges({ ranges, onChange, maxDuration }: Props) {
  const [open, setOpen] = useState(false);

  const addRange = () => {
    const lastTo = ranges.length > 0 ? Math.max(...ranges.map(r => r.to)) : 0;
    onChange([...ranges, { from: lastTo, to: Math.min(lastTo + 30, maxDuration) }]);
  };

  const updateRange = (idx: number, field: "from" | "to", value: number) => {
    const updated = ranges.map((r, i) =>
      i === idx ? { ...r, [field]: Math.max(0, Math.min(value, maxDuration)) } : r
    );
    onChange(updated);
  };

  const removeRange = (idx: number) => {
    onChange(ranges.filter((_, i) => i !== idx));
  };

  const totalDays = ranges.reduce((sum, r) => sum + Math.max(0, r.to - r.from), 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 text-[10px] gap-1 font-normal text-muted-foreground hover:text-foreground"
        >
          <CalendarDays className="h-3 w-3" />
          {ranges.length > 0 ? `${totalDays}d` : "Set"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">Date Ranges</span>
            <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={addRange}>
              <Plus className="h-3 w-3" /> Add Range
            </Button>
          </div>
          {ranges.length === 0 && (
            <p className="text-[10px] text-muted-foreground text-center py-2">No ranges set. Click "Add Range" to start.</p>
          )}
          {ranges.map((range, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground w-8">From</span>
              <RangeIntInput
                value={range.from}
                max={maxDuration}
                onCommit={(n) => updateRange(idx, "from", n)}
                className="h-6 text-[10px] w-16 px-1 text-center"
              />
              <span className="text-[10px] text-muted-foreground w-4 text-center">To</span>
              <RangeIntInput
                value={range.to}
                max={maxDuration}
                onCommit={(n) => updateRange(idx, "to", n)}
                className="h-6 text-[10px] w-16 px-1 text-center"
              />
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeRange(idx)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}
          {ranges.length > 0 && (
            <div className="text-[10px] text-muted-foreground pt-1 border-t">
              Total active: <span className="font-semibold text-foreground">{totalDays} days</span>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
