export interface FormulaContext {
  qty: number;
  refs?: Record<string, number>; 
}

export function evalFormula(formula: string, qtyOrCtx: number | FormulaContext): number {
  if (!formula || !formula.trim()) return NaN;
  try {
    const ctx: FormulaContext = typeof qtyOrCtx === "number" ? { qty: qtyOrCtx } : qtyOrCtx;
    let expr = formula.replace(/\bqty\b/gi, String(ctx.qty));

    
    if (ctx.refs) {
      expr = expr.replace(/\b([A-Ca-c])(\d+)(?:\.([utwrUTWR]))?\b/g, (_m, letter, num, suffix) => {
        const key = `${letter.toUpperCase()}${num}${suffix ? "." + suffix.toLowerCase() : ""}`;
        return ctx.refs![key] !== undefined ? String(ctx.refs![key]) : "NaN";
      });
    }

    
    expr = expr.replace(/([\d.]+)\s*%/g, "($1/100)");

    expr = expr.replace(/[^0-9+\-*/().eNa\s]/g, ""); // strip unexpected chars (keep NaN)
    if (!expr.trim()) return NaN;
    const result = new Function(`"use strict"; return (${expr});`)();
    if (typeof result !== "number" || !isFinite(result)) return NaN;
    return Math.round((result + Number.EPSILON) * 100) / 100;
  } catch {
    return NaN;
  }
}

export function isValidFormula(formula: string): boolean {
  if (!formula || !formula.trim()) return false;
  return !isNaN(evalFormula(formula, 1));
}
