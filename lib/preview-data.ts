import { readFileSync } from "node:fs";
import path from "node:path";
import { setsFromDay } from "./lift";
import { addDays } from "./time";
import type { ChecklistItem, ChecklistKind, Exercise, Note, SessionWithSets, WorkoutDay } from "./types";

type Owner = {
  EX: [[string, string, string], number | null, string, string, string][];
  DAYS: [string, number[]][];
  CHECK: Record<ChecklistKind, string[]>;
  NOTES: [string, string][];
};

/** Local preview only (PREVIEW_MODE=1): the owner split with made-up workout history, so pages can be checked without a database. */
export function previewData(today: string) {
  let n = 0;
  const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
  const o = JSON.parse(readFileSync(path.join(process.cwd(), "lib/preview-owner.json"), "utf8")) as Owner;
  const exercises: Exercise[] = o.EX.map(([[muscle, name, equipment], w, note, alternative, reps], i) => ({ id: id(), muscle, name, equipment, sets: 1, reps, weight_lb: w, note, alternative, position: i }));
  const days: WorkoutDay[] = o.DAYS.map(([name, ix], i) => ({ id: id(), name, position: i, exerciseIds: ix.map((x) => exercises[x].id) }));
  const checklist: ChecklistItem[] = (Object.entries(o.CHECK) as [ChecklistKind, string[]][]).flatMap(([kind, list]) => list.map((body, i) => ({ id: id(), kind, body, position: i })));
  const notes: Note[] = o.NOTES.map(([title, body], i) => ({ id: id(), title, body, position: i }));
  const sessions: SessionWithSets[] = [];
  for (let k = 0; k < 12; k++) {
    const date = addDays(today, -1 - Math.floor(k * 1.4));
    const day = days[(days.length * 2 - 1 - k) % days.length];
    const sid = id();
    const drop = k * 2.5;
    const sets = setsFromDay(day, exercises, sid, id).map((s) => ({ ...s, weight_lb: s.weight_lb === null ? null : Math.max(0, s.weight_lb - drop), reps: 6 + (k % 3), done: true }));
    sessions.push({ id: sid, date, day_id: day.id, day_name: day.name, rest: false, status: "done", pre_done: [], post_done: [], refuel_done: [], bodyweight_lb: 205 - k * 0.3, notes: "", started_at: `${date}T18:00:00Z`, finished_at: `${date}T19:05:00Z`, sets });
  }
  sessions.splice(3, 0, { id: id(), date: addDays(today, -5), day_id: null, day_name: "Rest", rest: true, status: "done", pre_done: [], post_done: [], refuel_done: [], bodyweight_lb: null, notes: "", started_at: `${addDays(today, -5)}T12:00:00Z`, finished_at: null, sets: [] });
  const liveDay = days[0];
  const liveId = id();
  const live: SessionWithSets = {
    id: liveId, date: today, day_id: liveDay.id, day_name: liveDay.name, rest: false, status: "active", pre_done: checklist.slice(0, 3).map((c) => c.body), post_done: [], refuel_done: [], bodyweight_lb: null, notes: "", started_at: `${today}T18:00:00Z`, finished_at: null,
    sets: setsFromDay(liveDay, exercises, liveId, id).map((s, i) => (i < 2 ? { ...s, done: true, reps: i === 0 ? 9 : 7 } : s)),
  };
  return { exercises, days, checklist, notes, sessions, live };
}
