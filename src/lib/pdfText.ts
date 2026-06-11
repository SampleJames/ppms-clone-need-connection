
const REPLACEMENTS: Array<[RegExp, string]> = [
  
  [/[\u2205\u00F8\u03A6\u03C6\u2300]/g, "Ø"],
  
  [/[\u2018\u2019\u201A\u201B]/g, "'"],
  [/[\u201C\u201D\u201E\u201F]/g, '"'],
  [/[\u2032\u2035]/g, "'"],
  [/[\u2033\u2036]/g, '"'],
  
  [/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, "-"],
  
  [/\u2026/g, "..."],
  
  [/[\u2022\u2023\u25E6\u2043]/g, "*"],
  
  [/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, " "],
  
  [/[\u200B-\u200D\uFEFF\u2060]/g, ""],
  // Math / arrows / misc symbols with sensible ASCII fallbacks
  [/\u00D7/g, "x"],
  [/\u00F7/g, "/"],
  [/\u2248/g, "~"],
  [/\u2260/g, "!="],
  [/\u2264/g, "<="],
  [/\u2265/g, ">="],
  [/[\u2192\u279C\u2794]/g, "->"],
  [/\u2190/g, "<-"],
  [/[\u00B1]/g, "+/-"],
  [/\u221A/g, "sqrt"],
  
  [/\u00B2/g, "2"],
  [/\u00B3/g, "3"],
  [/\u00B9/g, "1"],
  
  [/\u00BC/g, "1/4"],
  [/\u00BD/g, "1/2"],
  [/\u00BE/g, "3/4"],
];

export function sanitizePdfText(input: unknown): string {
  if (input === null || input === undefined) return "";
  let s = String(input);
  if (!s) return s;
  for (const [re, rep] of REPLACEMENTS) s = s.replace(re, rep);
  // Final guard: drop anything still outside Latin-1 so jsPDF never hits .notdef
  // (which causes the broken-spacing bug). Replace with "?" so it's visible
  // that something was lost rather than silently corrupting the layout.
  // Note: charCodeAt is fine here since all our replacements above are BMP.
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code <= 0xff) out += s[i];
    else out += "?";
  }
  return out;
}

/**
 * autoTable `didParseCell` hook that sanitizes every cell's rendered text.
 * Drop this into every autoTable() call so no Unicode surprise can break the
 * layout.
 */
export function sanitizeAutoTableCell(data: { cell: { text: string[] | string } }) {
  const t = data.cell.text;
  if (Array.isArray(t)) {
    for (let i = 0; i < t.length; i++) t[i] = sanitizePdfText(t[i]);
  } else if (typeof t === "string") {
    data.cell.text = sanitizePdfText(t);
  }
}
