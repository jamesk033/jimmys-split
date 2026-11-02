export type Units = "lb" | "kg";
export type ChecklistKind = "pre" | "post" | "refuel";

export const KIND_LABEL: Record<ChecklistKind, string> = { pre: "Pre-lift checklist", post: "Post-lift checklist", refuel: "Refueling" };

export interface LiftSettings {
  user_id: string;
  units: Units | null;
  timezone: string;
  /** How they started: copied Jimmy's split, or built their own. Null until they pick. */
  setup: "template" | "own" | null;
}

/** One lift in the exercise list. Weight lives here so it carries across every day that uses it. */
export interface Exercise {
  id: string;
  muscle: string;
  name: string;
  equipment: string;
  sets: number;
  reps: string;
  weight_lb: number | null;
  note: string;
  alternative: string;
  position: number;
}

/** A workout day in the rotation (e.g. "A Upper 1") and its exercises in order. */
export interface WorkoutDay {
  id: string;
  name: string;
  position: number;
  exerciseIds: string[];
}

export interface ChecklistItem {
  id: string;
  kind: ChecklistKind;
  body: string;
  position: number;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  position: number;
}

export interface SetRow {
  id: string;
  session_id: string;
  exercise_id: string | null;
  name: string;
  target_reps: string;
  position: number;
  set_no: number;
  weight_lb: number | null;
  reps: number | null;
  done: boolean;
}

export interface Session {
  id: string;
  date: string;
  day_id: string | null;
  day_name: string;
  rest: boolean;
  status: "active" | "done";
  pre_done: string[];
  post_done: string[];
  refuel_done: string[];
  bodyweight_lb: number | null;
  notes: string;
  started_at: string;
  finished_at: string | null;
}

export interface SessionWithSets extends Session {
  sets: SetRow[];
}

/** Lower days get the green color, everything else purple. */
export const isLower = (dayName: string) => /lower|leg/i.test(dayName);

/** "A Upper 1" -> "AU1" for tight spots like the calendar. */
export function shortDay(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return name.slice(0, 4);
  return words.map((w) => (/^\d+$/.test(w) ? w : w[0].toUpperCase())).join("");
}

export const exerciseLabel = (e: Pick<Exercise, "muscle" | "name">) => (e.muscle ? `${e.muscle} · ${e.name}` : e.name);

const num = (v: unknown): number | null => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

export function normalizeExercise(r: Record<string, unknown>): Exercise {
  return {
    id: String(r.id),
    muscle: String(r.muscle ?? ""),
    name: String(r.name ?? ""),
    equipment: String(r.equipment ?? ""),
    sets: Number(r.sets ?? 1),
    reps: String(r.reps ?? ""),
    weight_lb: num(r.weight_lb),
    note: String(r.note ?? ""),
    alternative: String(r.alternative ?? ""),
    position: Number(r.position ?? 0),
  };
}

export function normalizeSet(r: Record<string, unknown>): SetRow {
  return {
    id: String(r.id),
    session_id: String(r.session_id),
    exercise_id: r.exercise_id ? String(r.exercise_id) : null,
    name: String(r.name ?? ""),
    target_reps: String(r.target_reps ?? ""),
    position: Number(r.position ?? 0),
    set_no: Number(r.set_no ?? 1),
    weight_lb: num(r.weight_lb),
    reps: num(r.reps),
    // Reps typed = done, even if the tick never got saved.
    done: Boolean(r.done) || (num(r.reps) ?? 0) > 0,
  };
}

export function normalizeSession(r: Record<string, unknown>): Session {
  return {
    id: String(r.id),
    date: String(r.date),
    day_id: r.day_id ? String(r.day_id) : null,
    day_name: String(r.day_name ?? ""),
    rest: Boolean(r.rest),
    status: r.status === "done" ? "done" : "active",
    pre_done: (r.pre_done as string[]) ?? [],
    post_done: (r.post_done as string[]) ?? [],
    refuel_done: (r.refuel_done as string[]) ?? [],
    bodyweight_lb: num(r.bodyweight_lb),
    notes: String(r.notes ?? ""),
    started_at: String(r.started_at ?? ""),
    finished_at: r.finished_at ? String(r.finished_at) : null,
  };
}
