/**
 * Sections in a saved order of ids. A section that isn't in the saved order yet (added to the site later)
 * goes right after the section it follows by default, e.g. Indicators after Reminders, before Videos.
 */
export function arrange<T extends { id: string }>(sections: T[], order: string[]): T[] {
  const out = [...new Set(order)].map((id) => sections.find((s) => s.id === id)).filter((s): s is T => !!s);
  sections.forEach((s, i) => {
    if (out.includes(s)) return;
    const prev = sections.slice(0, i).reverse().find((p) => out.includes(p));
    out.splice(prev ? out.indexOf(prev) + 1 : 0, 0, s);
  });
  return out;
}
