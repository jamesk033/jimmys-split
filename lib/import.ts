/**
 * Paste-in split import. Each day is a block: the day name on the first line,
 * then one exercise per line. Blank lines separate days.
 *
 *   A Upper 1
 *   Back - wide-grip lat pulldown - strap | 260 | 4-8
 *   Upper Chest - incline chest press - belt
 *
 * Exercise lines: "Muscle - Exercise - Equipment", where muscle and equipment are optional
 * (a line with no " - " is just the exercise name). After a "|" come an optional weight and rep range.
 * A day name line may end with a time like "- 80 mins", which is dropped.
 */
export interface ImportedExercise {
  muscle: string;
  name: string;
  equipment: string;
  weight: number | null;
  reps: string | null;
}
export interface ImportedDay {
  name: string;
  exercises: ImportedExercise[];
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export function parseExerciseLine(line: string): ImportedExercise | null {
  const [main, ...extra] = line.split("|").map(clean);
  if (!main) return null;
  // Split on " - " but keep arrows like "row--> shrug" together.
  const parts = main.split(/\s+-\s+/).map(clean).filter(Boolean);
  let muscle = "";
  let name = "";
  let equipment = "";
  if (parts.length === 1) name = parts[0];
  else if (parts.length === 2) [muscle, name] = parts;
  else [muscle, name, equipment] = [parts[0], parts[1], parts.slice(2).join(", ")];
  let weight: number | null = null;
  let reps: string | null = null;
  for (const x of extra) {
    if (/^\d+(\.\d+)?\s*(lbs?|kg)?s?$/i.test(x) && weight === null) weight = parseFloat(x);
    else if (/^\d+\s*-\s*\d+$|^\d+$/.test(x) && reps === null) reps = x.replace(/\s/g, "");
  }
  if (!name) return null;
  return { muscle: cap(muscle).slice(0, 60), name: cap(name).slice(0, 120), equipment: equipment.slice(0, 120), weight, reps };
}

export function parseSplit(text: string): ImportedDay[] {
  const blocks = text
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((b) => b.split("\n").map(clean).filter(Boolean))
    .filter((b) => b.length);
  const days: ImportedDay[] = [];
  for (const b of blocks) {
    const name = b[0].replace(/\s+-\s+\d+\s*mins?$/i, "").replace(/:$/, "").slice(0, 60);
    const exercises = b
      .slice(1)
      .map((l) => parseExerciseLine(l.replace(/^[-*•\d.)\s]+(?=[A-Za-z])/, "")))
      .filter((e): e is ImportedExercise => !!e);
    if (name) days.push({ name, exercises });
  }
  return days;
}
