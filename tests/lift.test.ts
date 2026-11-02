import { describe, expect, it } from "vitest";
import { allTimeBests, e1rm, firstReps, nextDay, prsIn, progressFor, setsFromDay, shouldGoUp, summarize, volume } from "@/lib/lift";
import { fmtWeight, fromUnit, toUnit } from "@/lib/units";
import { shortDay, type SessionWithSets, type SetRow, type WorkoutDay } from "@/lib/types";

const set = (p: Partial<SetRow>): SetRow => ({ id: Math.random().toString(), session_id: "s", exercise_id: null, name: "Bench", target_reps: "5", position: 0, set_no: 1, weight_lb: 225, reps: 5, done: true, ...p });
const sess = (id: string, date: string, day: string, sets: SetRow[], status: "done" | "active" = "done", rest = false): SessionWithSets => ({
  id, date, day_id: day, day_name: day, rest, status, pre_done: [], post_done: [], refuel_done: [], bodyweight_lb: null, notes: "", started_at: `${date}T18:00:00Z`, finished_at: null, sets,
});

const DAYS: WorkoutDay[] = ["A Upper 1", "A Lower 1", "A Upper 2", "A Lower 2", "B Upper 1", "B Lower 1", "B Upper 2", "B Lower 2"].map((name, i) => ({ id: name, name, position: i, exerciseIds: [] }));

describe("rotation", () => {
  it("starts on the first day and goes to the one after the last workout", () => {
    expect(nextDay([], DAYS)?.name).toBe("A Upper 1");
    expect(nextDay([sess("a", "2026-10-01", "A Upper 1", [])], DAYS)?.name).toBe("A Lower 1");
    expect(nextDay([sess("a", "2026-10-01", "A Upper 1", []), sess("b", "2026-10-03", "A Lower 1", [])], DAYS)?.name).toBe("A Upper 2");
  });
  it("wraps from B Lower 2 back to A Upper 1", () => {
    expect(nextDay([sess("a", "2026-10-01", "B Lower 2", [])], DAYS)?.name).toBe("A Upper 1");
  });
  it("ignores rest days and a workout still going", () => {
    expect(nextDay([sess("a", "2026-10-01", "A Upper 1", []), sess("r", "2026-10-02", "Rest", [], "done", true), sess("b", "2026-10-03", "A Lower 1", [], "active")], DAYS)?.name).toBe("A Lower 1");
  });
  it("shortens day names for the calendar", () => {
    expect(shortDay("A Upper 1")).toBe("AU1");
  });
});

describe("progressive overload", () => {
  it("says go up after beating the top of the range", () => {
    expect(shouldGoUp("4-8", 9)).toBe(true);
    expect(shouldGoUp("4-8", 8)).toBe(false);
    expect(shouldGoUp("4-6", 7)).toBe(true);
    expect(shouldGoUp("6-10", 11)).toBe(true);
    expect(shouldGoUp("6-10", null)).toBe(false);
  });
});

describe("numbers", () => {
  it("reads rep targets", () => {
    expect(firstReps("8-10")).toBe(8);
    expect(firstReps("5")).toBe(5);
    expect(firstReps("AMRAP")).toBeNull();
  });
  it("estimates a max only for 1 to 12 reps", () => {
    expect(e1rm(315, 1)).toBe(315);
    expect(e1rm(225, 5)).toBeCloseTo(262.5);
    expect(e1rm(135, 20)).toBeNull();
    expect(e1rm(null, 5)).toBeNull();
  });
  it("counts volume from every set with reps, ticked or not", () => {
    expect(volume([set({ weight_lb: 100, reps: 10 }), set({ weight_lb: 100, reps: 10, done: false }), set({ weight_lb: 100, reps: null, done: false })])).toBe(2000);
  });
  it("converts lbs and kg both ways", () => {
    expect(toUnit(220.462, "kg")).toBe(100);
    expect(toUnit(fromUnit(102.5, "kg"), "kg")).toBe(102.5);
    expect(fmtWeight(315, "lb")).toBe("315 lb");
    expect(fmtWeight(null, "kg")).toBe("–");
  });
});

describe("PRs and progress", () => {
  const a = sess("a", "2026-10-01", "A Upper 1", [set({ weight_lb: 225, reps: 5 })]);
  const b = sess("b", "2026-10-03", "A Upper 2", [set({ weight_lb: 235, reps: 5 }), set({ name: "Row", weight_lb: 185, reps: 8 })]);
  it("calls out a beaten max but not a first-time lift", () => {
    const prs = prsIn(b, [a, b]);
    expect(prs.map((p) => p.name)).toEqual(["Bench"]);
    expect(prsIn(a, [a, b])).toEqual([]);
  });
  it("tracks best lifts and a series over time", () => {
    expect(allTimeBests([a, b])[0].weight).toBe(235);
    expect(progressFor([b, a], "bench").map((p) => p.top)).toEqual([225, 235]);
  });
});

describe("new workout", () => {
  it("builds sets from the day at current weights, in day order", () => {
    let i = 0;
    const ex = [
      { id: "e1", muscle: "Back", name: "Pulldown", equipment: "strap", sets: 1, reps: "4-8", weight_lb: 260, note: "", alternative: "", position: 0 },
      { id: "e2", muscle: "Quad", name: "Hack squat", equipment: "", sets: 1, reps: "4-6", weight_lb: 390, note: "", alternative: "", position: 1 },
    ];
    const sets = setsFromDay({ id: "d", name: "Test", position: 0, exerciseIds: ["e2", "e1"] }, ex, "s1", () => `id${++i}`);
    expect(sets.map((s) => [s.name, s.weight_lb, s.position])).toEqual([["Hack squat", 390, 0], ["Pulldown", 260, 1]]);
  });
});

describe("summary", () => {
  it("counts weeks in a row", () => {
    const s = summarize([sess("a", "2026-10-26", "A Upper 1", []), sess("b", "2026-10-20", "A Lower 1", []), sess("c", "2026-10-06", "A Upper 2", [])], "2026-11-01");
    expect(s.weekStreak).toBe(2);
    expect(s.thisWeek).toBe(1);
    expect(s.daysSinceLast).toBe(6);
  });
});

import { isDone } from "@/lib/lift";
describe("reps count as done", () => {
  it("counts a set with reps even if it was never ticked", () => {
    expect(isDone({ reps: 6 })).toBe(true);
    expect(isDone({ reps: null })).toBe(false);
    expect(isDone({ reps: 0 })).toBe(false);
  });
});
