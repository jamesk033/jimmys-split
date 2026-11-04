import { addDays, weekStart } from "./time";
import type { Exercise, Session, SessionWithSets, SetRow, WorkoutDay } from "./types";

/** Finished workouts, not rest days. */
export const isWorkout = (s: Pick<Session, "status" | "rest">) => s.status === "done" && !s.rest;

/**
 * The rotation: the next day is the one after the last workout you logged, wrapping back to the first.
 * Rest days don't move it. A workout whose day was deleted is matched by name.
 */
export function nextDay(sessions: Pick<Session, "day_id" | "day_name" | "status" | "rest" | "date" | "started_at">[], days: WorkoutDay[]): WorkoutDay | null {
  const order = [...days].sort((a, b) => a.position - b.position);
  if (!order.length) return null;
  const done = sessions.filter(isWorkout).sort((a, b) => (b.date + b.started_at).localeCompare(a.date + a.started_at));
  for (const s of done) {
    const i = order.findIndex((d) => d.id === s.day_id || (!s.day_id && d.name === s.day_name));
    if (i >= 0) return order[(i + 1) % order.length];
  }
  return order[0];
}

/** First number in a rep target: "8-10" -> 8, "5" -> 5, "AMRAP" -> null. */
export function firstReps(target: string): number | null {
  const m = target.match(/\d+/);
  if (!m) return null;
  const n = Number(m[0]);
  return n > 0 && n <= 200 ? n : null;
}

/** Last number in a rep target: "4-8" -> 8. */
export function topReps(target: string): number | null {
  const all = target.match(/\d+/g);
  if (!all) return null;
  const n = Number(all[all.length - 1]);
  return n > 0 && n <= 200 ? n : null;
}

/** Progressive overload: beat the top of the range (9 on 4-8) and it's time to go up. */
export function shouldGoUp(target: string, reps: number | null): boolean {
  const top = topReps(target);
  return top !== null && reps !== null && reps > top;
}

/** Estimated one-rep max (Epley). Only sets of 1 to 12 reps count; past that the guess gets loose. */
export function e1rm(weightLb: number | null, reps: number | null): number | null {
  if (weightLb === null || reps === null || weightLb <= 0 || reps < 1 || reps > 12) return null;
  return reps === 1 ? weightLb : weightLb * (1 + reps / 30);
}

/** A set is done once it has reps. There's no tick box: typing reps logs the set. */
export const isDone = (s: Pick<SetRow, "reps">) => (s.reps ?? 0) > 0;

const counted = (s: SetRow) => isDone(s) && s.weight_lb !== null && s.reps !== null && s.reps > 0;

/** Pounds moved: weight x reps over finished sets. */
export function volume(sets: SetRow[]): number {
  return sets.filter(counted).reduce((t, s) => t + (s.weight_lb ?? 0) * (s.reps ?? 0), 0);
}

export const setsDone = (sets: SetRow[]) => sets.filter(isDone).length;

export interface Best {
  name: string;
  e1rm: number;
  weight: number;
  reps: number;
  date: string;
  sessionId: string;
}

/** The best set (by estimated max) for each exercise in one workout. */
export function bestsIn(session: SessionWithSets): Map<string, Best> {
  const out = new Map<string, Best>();
  for (const s of session.sets) {
    if (!counted(s)) continue;
    const est = e1rm(s.weight_lb, s.reps);
    if (est === null) continue;
    const key = s.name.trim().toLowerCase();
    const cur = out.get(key);
    if (!cur || est > cur.e1rm) out.set(key, { name: s.name, e1rm: est, weight: s.weight_lb!, reps: s.reps!, date: session.date, sessionId: session.id });
  }
  return out;
}

/** All-time best per exercise across finished workouts, strongest first. */
export function allTimeBests(sessions: SessionWithSets[]): Best[] {
  const out = new Map<string, Best>();
  for (const s of sessions) {
    if (!isWorkout(s)) continue;
    for (const [k, b] of bestsIn(s)) {
      const cur = out.get(k);
      if (!cur || b.e1rm > cur.e1rm) out.set(k, b);
    }
  }
  return [...out.values()].sort((a, b) => b.e1rm - a.e1rm);
}

/** New estimated-max records set in this workout, compared with every earlier workout. First time doing a lift isn't a PR. */
export function prsIn(session: SessionWithSets, all: SessionWithSets[]): Best[] {
  const earlier = all.filter((s) => s.id !== session.id && isWorkout(s) && (s.date + s.started_at).localeCompare(session.date + session.started_at) < 0);
  const before = new Map<string, number>();
  for (const s of earlier) for (const [k, b] of bestsIn(s)) before.set(k, Math.max(before.get(k) ?? 0, b.e1rm));
  const prs: Best[] = [];
  for (const [k, b] of bestsIn(session)) {
    const prev = before.get(k);
    if (prev !== undefined && b.e1rm > prev + 0.01) prs.push(b);
  }
  return prs.sort((a, b) => b.e1rm - a.e1rm);
}

/** Estimated max and top set weight over time for one exercise. */
export function progressFor(sessions: SessionWithSets[], name: string): { date: string; e1rm: number; top: number }[] {
  const key = name.trim().toLowerCase();
  return sessions
    .filter(isWorkout)
    .map((s) => ({ s, b: bestsIn(s).get(key) }))
    .filter((x) => x.b)
    .sort((a, b) => a.s.date.localeCompare(b.s.date))
    .map(({ s, b }) => ({ date: s.date, e1rm: b!.e1rm, top: Math.max(...s.sets.filter((x) => counted(x) && x.name.trim().toLowerCase() === key).map((x) => x.weight_lb!)) }));
}

/** Exercise names that have logged sets, most recent first. */
export function loggedNames(sessions: SessionWithSets[]): string[] {
  const seen = new Map<string, string>();
  for (const s of [...sessions].sort((a, b) => b.date.localeCompare(a.date))) for (const x of s.sets) if (counted(x) && !seen.has(x.name.trim().toLowerCase())) seen.set(x.name.trim().toLowerCase(), x.name);
  return [...seen.values()];
}

export interface Summary {
  thisWeek: number;
  thisMonth: number;
  total: number;
  /** Weeks in a row (Mon to Sun) with at least one workout, counting back from this week (or last week if this one is still empty). */
  weekStreak: number;
  weekVolume: number;
  lastBodyweight: number | null;
  daysSinceLast: number | null;
}

export function summarize(sessions: SessionWithSets[], today: string): Summary {
  const done = sessions.filter(isWorkout);
  const wk = weekStart(today);
  const month = today.slice(0, 7);
  const weeks = new Set(done.map((s) => weekStart(s.date)));
  let streak = 0;
  let cursor = weeks.has(wk) ? wk : addDays(wk, -7);
  while (weeks.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -7);
  }
  const byDate = [...done].sort((a, b) => b.date.localeCompare(a.date));
  const bw = [...sessions].filter((s) => s.status === "done").sort((a, b) => b.date.localeCompare(a.date)).find((s) => s.bodyweight_lb !== null);
  const last = byDate[0]?.date;
  return {
    thisWeek: done.filter((s) => s.date >= wk && s.date <= today).length,
    thisMonth: done.filter((s) => s.date.startsWith(month)).length,
    total: done.length,
    weekStreak: streak,
    weekVolume: done.filter((s) => s.date >= wk && s.date <= today).reduce((t, s) => t + volume(s.sets), 0),
    lastBodyweight: bw?.bodyweight_lb ?? null,
    daysSinceLast: last ? Math.max(0, Math.round((Date.parse(today) - Date.parse(last)) / 86_400_000)) : null,
  };
}

/** Fresh sets for a new workout from one day of the split, at each exercise's current weight. */
export function setsFromDay(day: WorkoutDay, exercises: Exercise[], sessionId: string, makeId: () => string): SetRow[] {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const out: SetRow[] = [];
  day.exerciseIds.forEach((id, i) => {
    const e = byId.get(id);
    if (!e) return;
    for (let n = 1; n <= e.sets; n++) {
      out.push({ id: makeId(), session_id: sessionId, exercise_id: e.id, name: e.name, target_reps: e.reps, position: i, set_no: n, weight_lb: e.weight_lb, reps: null, done: false });
    }
  });
  return out;
}

/** Sets grouped by exercise, in workout order. */
export function groupSets(sets: SetRow[]): { key: string; name: string; exerciseId: string | null; target: string; position: number; sets: SetRow[] }[] {
  const groups = new Map<string, { key: string; name: string; exerciseId: string | null; target: string; position: number; sets: SetRow[] }>();
  for (const s of [...sets].sort((a, b) => a.position - b.position || a.set_no - b.set_no)) {
    const key = `${s.position}:${s.exercise_id ?? s.name}`;
    const g = groups.get(key) ?? { key, name: s.name, exerciseId: s.exercise_id, target: s.target_reps, position: s.position, sets: [] };
    g.sets.push(s);
    groups.set(key, g);
  }
  return [...groups.values()];
}

/**
 * Days that ended with nothing logged, from the first day you ever logged through yesterday,
 * capped to the last 90 days. Each one gets saved as a rest day.
 */
export function unloggedDays(loggedDates: string[], today: string, maxBack = 90): string[] {
  if (!loggedDates.length) return [];
  const have = new Set(loggedDates);
  const first = [...loggedDates].sort()[0];
  const out: string[] = [];
  for (let d = addDays(today, -1), n = 0; d >= first && n < maxBack; d = addDays(d, -1), n++) if (!have.has(d)) out.push(d);
  return out.reverse();
}
