/** Small words that stay lower case unless they start the text. */
const MINOR = new Set(["a", "an", "the", "and", "or", "nor", "but", "of", "to", "in", "on", "at", "by", "for", "as", "vs", "via", "w/"]);

/** Capitalizes one word part, unless it already has a capital after its first letter (iFVG, NQ1!, PDH/L stay as typed). */
function cap(part: string): string {
  const i = part.search(/[A-Za-z]/);
  // Numbers with units stay as typed: 9:30am, 10am, 1m, 5s.
  if (i < 0 || /^\d/.test(part)) return part;
  const rest = part.slice(i + 1);
  if (/[A-Z]/.test(rest) || /[a-z]/.test(part.slice(0, i))) return part;
  return part.slice(0, i) + part[i].toUpperCase() + rest;
}

/**
 * Title Case for the site's lists, rules and options: every important word starts with a capital, small words
 * (the, and, or, of...) stay lower case except at the start. Links, numbers and words like iFVG are left alone.
 */
export function titleCase(text: string): string {
  if (!text) return text;
  let first = true;
  return text
    .split(/(\s+)/)
    .map((w) => {
      if (!w.trim()) return w;
      if (/^(https?:\/\/|www\.)/i.test(w) || /@/.test(w)) {
        first = false;
        return w;
      }
      const bare = w.replace(/^[("'[]+|[)"'\].,;:!?]+$/g, "").toLowerCase();
      const out = !first && MINOR.has(bare) ? w : w.split(/([-/])/).map((p) => (p === "-" || p === "/" ? p : cap(p))).join("");
      // A new phrase starts after a colon, period or semicolon.
      first = /[:.;?]$/.test(w) && !/^\.?\d/.test(w);
      return out;
    })
    .join("");
}
