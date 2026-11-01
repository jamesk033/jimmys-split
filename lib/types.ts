export type Units = "lb" | "kg";
export type Day = "upper" | "lower";
export type ChecklistKind = "pre" | "post" | "refuel";

export const DAYS: Day[] = ["upper", "lower"];
export const DAY_LABEL: Record<Day, string> = { upper: "Upper", lower: "Lower" };
export const KIND_LABEL: Record<ChecklistKind, string> = { pre: "Pre-lift checklist", post: "Post-lift checklist", refuel: "Refueling" };

export interface LiftSettings {
  user_id: string;
  units: Units | null;
  timezone: string;
}

export interface Exercise {
  id: string;
  day: Day;
  name: string;
  sets: number;
  reps: string;
  weight_lb: number | null;
  note: string;
  position: number;
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
  day: Day;
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

const num = (v: unknown): number | null => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

export function normalizeExercise(r: Record<string, unknown>): Exercise {
  return {
    id: String(r.id),
    day: r.day === "lower" ? "lower" : "upper",
    name: String(r.name ?? ""),
    sets: Number(r.sets ?? 3),
    reps: String(r.reps ?? ""),
    weight_lb: num(r.weight_lb),
    note: String(r.note ?? ""),
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
    done: Boolean(r.done),
  };
}

export function normalizeSession(r: Record<string, unknown>): Session {
  return {
    id: String(r.id),
    date: String(r.date),
    day: r.day === "lower" ? "lower" : "upper",
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
