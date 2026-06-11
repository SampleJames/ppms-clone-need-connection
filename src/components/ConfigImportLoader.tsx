import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, PackageOpen, Sparkles } from "lucide-react";

const WITTY_LINES = [
  "Unpacking your workspace…",
  "Dusting off old projects…",
  "Convincing the bytes to behave…",
  "Re-hydrating templates with electrolytes…",
  "Counting every DUPA twice (just to be sure)…",
  "Re-shelving the pricelist alphabetically…",
  "Bribing the S-curve to stay smooth…",
  "Polishing print layouts to a mirror shine…",
  "Putting favorites back on the front row…",
  "Almost there — straightening the picture frames…",
];

interface Props {
    state: "working" | "done" | null;
  fileName?: string;
}

export default function ConfigImportLoader({ state, fileName }: Props) {
  const [lineIdx, setLineIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (state !== "working") return;
    setLineIdx(0);
    setElapsed(0);
    const t = setInterval(() => setLineIdx((i) => (i + 1) % WITTY_LINES.length), 1600);
    const e = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => {
      clearInterval(t);
      clearInterval(e);
    };
  }, [state]);

  if (!state) return null;

  const done = state === "done";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md mx-4 rounded-2xl border bg-card shadow-2xl overflow-hidden">
        {}
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(600px circle at 0% 0%, hsl(var(--primary) / 0.18), transparent 40%), radial-gradient(500px circle at 100% 100%, hsl(var(--primary) / 0.12), transparent 45%)",
          }}
        />
        <div className="relative p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
              <div className="relative h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                {done ? (
                  <CheckCircle2 className="h-7 w-7 text-primary animate-scale-in" />
                ) : (
                  <PackageOpen className="h-7 w-7 text-primary animate-pulse" />
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                {done ? "All set!" : "Restoring workspace"}
                {done && <Sparkles className="h-4 w-4 text-primary" />}
              </h3>
              {fileName && (
                <p className="text-xs text-muted-foreground truncate">{fileName}</p>
              )}
            </div>
          </div>

          {}
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={
                done
                  ? "h-full w-full bg-primary transition-all duration-500"
                  : "h-full w-1/3 bg-gradient-to-r from-primary/40 via-primary to-primary/40 animate-[slide-in-right_1.4s_ease-in-out_infinite]"
              }
              style={done ? undefined : { animation: "shimmer 1.4s ease-in-out infinite" }}
            />
          </div>

          <div className="min-h-[48px] flex items-start gap-2">
            {!done && <Loader2 className="h-4 w-4 mt-0.5 animate-spin text-primary shrink-0" />}
            <p className="text-sm text-muted-foreground leading-relaxed">
              {done
                ? "Your workspace is back exactly as it was. Reloading…"
                : WITTY_LINES[lineIdx]}
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground/70">
            <span>{done ? "Reloading your workspace…" : `${elapsed}s elapsed`}</span>
            <span>{done ? "" : "Please don't close this tab"}</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}
