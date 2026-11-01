import { DEFAULT_CHECKLIST, DEFAULT_EXERCISES, DEFAULT_NOTES } from "./defaults";
import { setsFromSplit } from "./lift";
import { addDays } from "./time";
import type { ChecklistItem, Exercise, Note, SessionWithSets } from "./types";

/** Local preview only (PREVIEW_MODE=1): made-up example data so pages can be checked without a database. */
export function previewData(today: string) {
  let n = 0;
  const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
  const base: Record<string, number> = { "Bench press": 275, "Barbell row": 205, "Overhead press": 145, "Pull-ups": 0, Curls: 75, "Triceps pushdown": 60, Squat: 365, "Romanian deadlift": 275, "Leg press": 450, "Leg curl": 110, "Calf raises": 180 };
  const exercises: Exercise[] = DEFAULT_EXERCISES.map((e, i) => ({ ...e, id: id(), position: i, weight_lb: base[e.name] + 10 }));
  const checklist: ChecklistItem[] = DEFAULT_CHECKLIST.map((c, i) => ({ ...c, id: id(), position: i }));
  const notes: Note[] = DEFAULT_NOTES.map((x, i) => ({ ...x, id: id(), position: i, body: x.body || "Example text." }));
  const sessions: SessionWithSets[] = [];
  for (let k = 0; k < 12; k++) {
    const date = addDays(today, -2 - Math.floor(k * 1.7));
    const day = k % 2 === 0 ? "lower" : "upper";
    const sid = id();
    const bump = (12 - k) * 2.5;
    const sets = setsFromSplit(exercises, day, sid, id).map((s) => ({ ...s, weight_lb: (base[s.name] ?? 100) - 10 + bump, done: true }));
    sessions.push({ id: sid, date, day, status: "done", pre_done: checklist.filter((c) => c.kind === "pre").map((c) => c.body), post_done: [], refuel_done: [], bodyweight_lb: 205 - k * 0.3, notes: "", started_at: `${date}T18:00:00Z`, finished_at: `${date}T19:05:00Z`, sets });
  }
  const liveId = id();
  const live: SessionWithSets = {
    id: liveId, date: today, day: "upper", status: "active", pre_done: [checklist[0].body, checklist[1].body], post_done: [], refuel_done: [], bodyweight_lb: null, notes: "", started_at: `${today}T18:00:00Z`, finished_at: null,
    sets: setsFromSplit(exercises, "upper", liveId, id).map((s, i) => ({ ...s, done: i < 4 })),
  };
  return { exercises, checklist, notes, sessions, live };
}
