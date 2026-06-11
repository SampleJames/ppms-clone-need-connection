import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface NumberFieldProps
  extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> {
  value: number;
  onValueChange: (n: number) => void;
  fallback?: number;
  allowNegative?: boolean;
}

export const NumberField = React.forwardRef<HTMLInputElement, NumberFieldProps>(
  ({ value, onValueChange, fallback = 0, allowNegative = false, className, ...props }, ref) => {
    const [local, setLocal] = React.useState<string>(String(value ?? ""));
    const [focused, setFocused] = React.useState(false);

    if (!focused && String(value ?? "") !== local) {
      // sync from parent when not editing
      setLocal(String(value ?? ""));
    }

    const pattern = allowNegative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/;

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="decimal"
        className={cn(className)}
        value={focused ? local : String(value ?? "")}
        onFocus={(e) => {
          setFocused(true);
          setLocal(String(value ?? ""));
          setTimeout(() => e.target.select(), 0);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          const parsed = parseFloat(local);
          onValueChange(isNaN(parsed) ? fallback : parsed);
          props.onBlur?.(e);
        }}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "" || (allowNegative && v === "-") || pattern.test(v)) {
            setLocal(v);
          }
        }}
        onKeyDown={(e) => {
          const allowed = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Tab", "Home", "End", "Enter", "Escape"];
          if (!allowed.includes(e.key) && !((e.ctrlKey || e.metaKey) && ["a", "c", "v", "x", "z"].includes(e.key.toLowerCase()))) {
            if (!/^[0-9.]$/.test(e.key) && !(allowNegative && e.key === "-")) {
              e.preventDefault();
            }
          }
          if (e.key === "Enter" || e.key === "Escape") {
            e.preventDefault();
            (e.currentTarget as HTMLInputElement).blur();
          }
          props.onKeyDown?.(e);
        }}
      />
    );
  }
);
NumberField.displayName = "NumberField";