import { cn } from "@/lib/utils";

export function composeSpec(extraDesc1?: string, extraDesc2?: string): string | undefined {
  const parts = [extraDesc1, extraDesc2].map((p) => (p ?? "").trim()).filter(Boolean);
  return parts.length > 0 ? parts.join(" • ") : undefined;
}

interface SpecTextProps {
  spec?: string;
  className?: string;
  /** xs = template form rows (very tight), sm = DUPA tables (default) */
  size?: "sm" | "xs";
}

export function SpecText({ spec, className, size = "sm" }: SpecTextProps) {
  if (!spec || !spec.trim()) return null;
  const sizeCls = size === "xs" ? "text-[10px] leading-tight" : "text-[11px] leading-tight";
  return (
    <div
      className={cn(
        "mt-0.5 text-muted-foreground/90 italic truncate",
        sizeCls,
        className,
      )}
      title={spec}
    >
      <span className="text-primary/60 not-italic mr-1">•</span>
      {spec}
    </div>
  );
}

export const SpecBadge = SpecText;
