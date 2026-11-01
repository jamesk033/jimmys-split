import type { ChecklistKind, Day } from "./types";

/** Used for a brand-new account only when the site owner hasn't set up a template yet. Everything is editable. */
export const DEFAULT_EXERCISES: { day: Day; name: string; sets: number; reps: string; note: string }[] = [
  { day: "upper", name: "Bench press", sets: 3, reps: "6-8", note: "" },
  { day: "upper", name: "Barbell row", sets: 3, reps: "8-10", note: "" },
  { day: "upper", name: "Overhead press", sets: 3, reps: "8-10", note: "" },
  { day: "upper", name: "Pull-ups", sets: 3, reps: "8-12", note: "" },
  { day: "upper", name: "Curls", sets: 3, reps: "10-12", note: "" },
  { day: "upper", name: "Triceps pushdown", sets: 3, reps: "10-12", note: "" },
  { day: "lower", name: "Squat", sets: 3, reps: "5-8", note: "" },
  { day: "lower", name: "Romanian deadlift", sets: 3, reps: "8-10", note: "" },
  { day: "lower", name: "Leg press", sets: 3, reps: "10-12", note: "" },
  { day: "lower", name: "Leg curl", sets: 3, reps: "10-12", note: "" },
  { day: "lower", name: "Calf raises", sets: 3, reps: "12-15", note: "" },
];

export const DEFAULT_CHECKLIST: { kind: ChecklistKind; body: string }[] = [
  { kind: "pre", body: "Water bottle filled" },
  { kind: "pre", body: "Pre-workout meal or snack" },
  { kind: "pre", body: "Warm-up done" },
  { kind: "post", body: "Cool down and stretch" },
  { kind: "post", body: "Weights for next time updated" },
  { kind: "refuel", body: "Protein within 2 hours" },
  { kind: "refuel", body: "Carbs with the meal" },
  { kind: "refuel", body: "Rehydrate" },
];

export const DEFAULT_NOTES: { title: string; body: string }[] = [
  { title: "Equipment", body: "" },
  { title: "How the split works", body: "Upper / Lower, repeat forever. Rest when needed. The next workout is always the opposite of the last one you finished." },
  { title: "How to do the sets", body: "" },
];
