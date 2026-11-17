import { bestsIn, isWorkout } from "./lift";
import { daysBetween, weekdayOf } from "./time";
import type { ChecklistItem, SessionWithSets } from "./types";

/** One condition: how many comparable workouts had it, and how many of those set a PR. */
export interface CondRow {
  label: string;
  n: number;
  prs: number;
  rate: number;
  /** PR rate minus the overall PR rate. */
  diff: number;
}

export interface CondGroup {
  title: string;
  note: string;
  rows: CondRow[];
}

export interface LiftConditions {
  /** Workouts that could set a PR (at least one lift done before). */
  total: number;
  prDays: number;
  base: number;
  groups: CondGroup[];
  edges: CondRow[];
  leaks: CondRow[];
}

/** Fewer workouts than this and a row isn't called an edge or a leak. */
export const MIN_N = 3;
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const order = (s: SessionWithSets) => s.date + s.started_at;

/**
 * What shows up on PR days versus flat days. Pre-lift items count for the same workout; post-lift and refuel
 * items count for the workout after (they happen once the lifting is over). PRs follow `prsIn`: beating every
 * earlier workout's estimated max on a lift; first-time lifts don't count, so workouts with only new lifts are skipped.
 */
export function liftConditions(sessions: SessionWithSets[], checklist: ChecklistItem[]): LiftConditions {
  const done = sessions.filter(isWorkout).sort((a, b) => order(a).localeCompare(order(b)));
  const best = new Map<string, number>();
  const rows: { s: SessionWithSets; prev: SessionWithSets | null; pr: boolean }[] = [];
  done.forEach((s, i) => {
    const mine = bestsIn(s);
    let comparable = false;
    let pr = false;
    for (const [k, b] of mine) {
      const before = best.get(k);
      if (before === undefined) continue;
      comparable = true;
      if (b.e1rm > before + 0.01) pr = true;
    }
    if (comparable) rows.push({ s, prev: i ? done[i - 1] : null, pr });
    for (const [k, b] of mine) best.set(k, Math.max(best.get(k) ?? 0, b.e1rm));
  });

  const total = rows.length;
  const prDays = rows.filter((r) => r.pr).length;
  const base = total ? prDays / total : 0;
  const row = (label: string, keep: (r: (typeof rows)[number]) => boolean): CondRow => {
    const sub = rows.filter(keep);
    const prs = sub.filter((r) => r.pr).length;
    const rate = sub.length ? prs / sub.length : 0;
    return { label, n: sub.length, prs, rate, diff: sub.length ? rate - base : 0 };
  };
  const items = (kind: ChecklistItem["kind"]) => checklist.filter((c) => c.kind === kind).sort((a, b) => a.position - b.position);
  const ticks = (field: "pre_done" | "post_done" | "refuel_done", prevOf: boolean) =>
    (kind: ChecklistItem["kind"]) =>
      items(kind).flatMap((c) => {
        const src = (r: (typeof rows)[number]) => (prevOf ? r.prev : r.s);
        return [row(`${c.body}: done`, (r) => !!src(r) && src(r)![field].includes(c.body)), row(`${c.body}: missed`, (r) => !!src(r) && !src(r)![field].includes(c.body))];
      });

  const restBucket = (r: (typeof rows)[number]) => {
    if (!r.prev) return null;
    const gap = daysBetween(r.prev.date, r.s.date);
    return gap <= 1 ? "Back to back" : gap === 2 ? "1 rest day" : gap === 3 ? "2 rest days" : "3+ rest days";
  };
  const groups: CondGroup[] = [
    { title: "Pre-lift checklist", note: "Ticked before that workout", rows: ticks("pre_done", false)("pre") },
    { title: "Post-lift checklist", note: "Ticked after the workout before", rows: ticks("post_done", true)("post") },
    { title: "Refueling", note: "Ticked after the workout before", rows: ticks("refuel_done", true)("refuel") },
    { title: "Rest before", note: "Days since the workout before", rows: ["Back to back", "1 rest day", "2 rest days", "3+ rest days"].map((b) => row(b, (r) => restBucket(r) === b)) },
    { title: "Day of the split", note: "", rows: [...new Set(rows.map((r) => r.s.day_name || "Workout"))].map((d) => row(d, (r) => (r.s.day_name || "Workout") === d)) },
    { title: "Day of the week", note: "", rows: [1, 2, 3, 4, 5, 6, 0].map((w) => row(WEEKDAYS[w], (r) => weekdayOf(r.s.date) === w)) },
  ].map((g) => ({ ...g, rows: g.rows.filter((r) => r.n > 0) }));

  const all = groups.flatMap((g) => g.rows).filter((r) => r.n >= MIN_N);
  return {
    total,
    prDays,
    base,
    groups: groups.filter((g) => g.rows.length),
    edges: all.filter((r) => r.diff >= 0.1).sort((a, b) => b.diff - a.diff || b.n - a.n).slice(0, 5),
    leaks: all.filter((r) => r.diff <= -0.1).sort((a, b) => a.diff - b.diff || b.n - a.n).slice(0, 5),
  };
}
