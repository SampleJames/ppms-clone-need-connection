import * as React from "react";
import { Check, ChevronsUpDown, Plus, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getUnits, addUnit, getFavoriteUnits, toggleFavoriteUnit } from "@/lib/storage";

interface UnitComboboxProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  allowFreeType?: boolean;
  size?: "sm" | "default";
}

export function UnitCombobox({
  value,
  onChange,
  placeholder = "Unit",
  className,
  triggerClassName,
  disabled,
  size = "default",
}: UnitComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [units, setUnits] = React.useState<string[]>(() => getUnits());
  const [favs, setFavs] = React.useState<string[]>(() => getFavoriteUnits());
  const [search, setSearch] = React.useState("");

  const refresh = React.useCallback(() => {
    setUnits(getUnits());
    setFavs(getFavoriteUnits());
  }, []);

  React.useEffect(() => {
    const handler = () => refresh();
    window.addEventListener("settingsChanged", handler);
    return () => window.removeEventListener("settingsChanged", handler);
  }, [refresh]);

  const filtered = search.trim()
    ? units.filter((u) => u.toLowerCase().includes(search.toLowerCase()))
    : units;

  const favSet = new Set(favs);
  const sorted = [...filtered].sort((a, b) => {
    const af = favSet.has(a) ? 0 : 1;
    const bf = favSet.has(b) ? 0 : 1;
    if (af !== bf) return af - bf;
    return 0;
  });

  const exactMatch = units.some((u) => u.toLowerCase() === search.trim().toLowerCase());
  const canAdd = search.trim().length > 0 && !exactMatch;

  const commitAdd = () => {
    if (!canAdd) return;
    const trimmed = search.trim();
    addUnit(trimmed);
    setUnits(getUnits());
    onChange(trimmed);
    setSearch("");
    setOpen(false);
  };

  const handleToggleFav = (e: React.MouseEvent, u: string) => {
    e.stopPropagation();
    toggleFavoriteUnit(u);
    setFavs(getFavoriteUnits());
  };

  const heightClass = size === "sm" ? "h-7 text-xs" : "h-10 text-sm";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            size === "sm" ? "px-1.5" : "px-2",
            heightClass,
            !value && "text-muted-foreground italic",
            triggerClassName,
            className
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[220px] p-0"
        align="start"
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <div className="p-2 border-b">
          <Input
            autoFocus
            placeholder="Search or add unit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canAdd) {
                e.preventDefault();
                commitAdd();
              }
            }}
            className="h-8 text-sm"
          />
        </div>
        <div className="max-h-60 overflow-y-auto py-1">
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setSearch("");
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm bg-popover border-b border-border/60 hover:bg-accent text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
              <span>Clear selection</span>
            </button>
          )}
          {sorted.length === 0 && !canAdd && (
            <div className="px-3 py-2 text-xs text-muted-foreground">No units found.</div>
          )}
          {sorted.map((u, idx) => {
            const isFav = favSet.has(u);
            return (
              <div
                key={u}
                className={cn(
                  "w-full flex items-center gap-1 px-2 py-1.5 text-sm bg-popover border-b border-border/60 last:border-b-0 hover:bg-accent hover:text-accent-foreground",
                  value === u && "bg-accent/70"
                )}
              >
                <button
                  type="button"
                  onClick={(e) => handleToggleFav(e, u)}
                  className="p-0.5 rounded hover:bg-background/60"
                  title={isFav ? "Unfavorite" : "Mark as favorite"}
                >
                  <Star
                    className={cn(
                      "h-3.5 w-3.5",
                      isFav ? "fill-amber-400 text-amber-400" : "text-muted-foreground/50"
                    )}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange(value === u ? "" : u);
                    setSearch("");
                    setOpen(false);
                  }}
                  className="flex-1 flex items-center gap-2 text-left min-w-0"
                >
                  <Check className={cn("h-3.5 w-3.5 shrink-0", value === u ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{u}</span>
                </button>
              </div>
            );
          })}
          {canAdd && (
            <button
              type="button"
              onClick={commitAdd}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left border-t mt-1 pt-2 text-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add &quot;{search.trim()}&quot;</span>
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}