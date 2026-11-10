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
  // "_" stands for "no muscle" when there is equipment.
  if (muscle === "_") muscle = "";
  let weight: number | null = null;
  let reps: string | null = null;
  const num = (x: string) => (/^\d+(\.\d+)?\s*(lbs?|kg)?s?$/i.test(x) ? parseFloat(x) : null);
  const range = (x: string) => (/^\d+\s*-\s*\d+$|^\d+$/.test(x) ? x.replace(/\s/g, "") : null);
  if (extra.length >= 2) {
    // "| weight | reps", where "-" means no weight.
    weight = extra[0] === "-" ? null : num(extra[0]);
    reps = range(extra[1]);
  } else if (extra.length === 1) {
    if (/\d\s*-\s*\d/.test(extra[0])) reps = range(extra[0]);
    else weight = num(extra[0]);
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

/** The whole split as text in the same format, so it can be edited in one box. Weights in the lifter's unit. */
export function splitToText(days: { name: string; exerciseIds: string[] }[], exercises: { id: string; muscle: string; name: string; equipment: string; weight: number | null; reps: string }[]): string {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  return days
    .map((d) =>
      [
        d.name,
        ...d.exerciseIds
          .map((id) => byId.get(id))
          .filter((e): e is NonNullable<typeof e> => !!e)
          .map((e) => {
            const main = [e.muscle, e.name, e.equipment].filter(Boolean).join(" - ");
            const w = e.weight === null ? "-" : String(e.weight);
            const line = e.muscle ? main : e.equipment ? `_ - ${e.name} - ${e.equipment}` : e.name;
            return `${line} | ${w} | ${e.reps || "4-8"}`;
          }),
      ].join("\n"),
    )
    .join("\n\n");
}
