import type { ChecklistKind } from "./types";

/**
 * Starter split for a new account, only used if the site owner hasn't set one up.
 * Normally new accounts copy the owner's split (without weights) through lift_template().
 */
export const DEFAULT_EXERCISES: { muscle: string; name: string; equipment: string; sets: number; reps: string; note: string; alternative: string }[] = [
  { muscle: "Back", name: "Lat pulldown", equipment: "", sets: 1, reps: "4-8", note: "", alternative: "" },
  { muscle: "Chest", name: "Incline chest press", equipment: "", sets: 1, reps: "4-8", note: "", alternative: "" },
  { muscle: "Side Delt", name: "Lateral raise", equipment: "", sets: 1, reps: "4-8", note: "", alternative: "" },
  { muscle: "Quad", name: "Hack squat", equipment: "", sets: 1, reps: "4-6", note: "", alternative: "" },
  { muscle: "Hamstring", name: "Leg curl", equipment: "", sets: 1, reps: "4-8", note: "", alternative: "" },
  { muscle: "Calf", name: "Standing calf raise", equipment: "", sets: 1, reps: "4-8", note: "", alternative: "" },
];

/** Day name and indexes into DEFAULT_EXERCISES. */
export const DEFAULT_DAYS: { name: string; exercises: number[] }[] = [
  { name: "Upper", exercises: [0, 1, 2] },
  { name: "Lower", exercises: [3, 4, 5] },
];

export const DEFAULT_CHECKLIST: { kind: ChecklistKind; body: string }[] = [
  { kind: "pre", body: "Warm-up sets done" },
  { kind: "post", body: "Stretch" },
  { kind: "refuel", body: "Protein and carbs" },
];

export const DEFAULT_NOTES: { title: string; body: string }[] = [
  { title: "How the split works", body: "Run the days in order, then start over. Rest when needed. The next workout is always the day after the last one you logged." },
  { title: "Necessary equipment", body: "" },
];
