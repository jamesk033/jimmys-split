import { describe, expect, it } from "vitest";
import { allTimeBests, e1rm, firstReps, nextDay, prsIn, progressFor, setsFromSplit, summarize, volume } from "@/lib/lift";
import { fmtWeight, fromUnit, toUnit } from "@/lib/units";
import type { SessionWithSets, SetRow } from "@/lib/types";

const set = (p: Partial<SetRow>): SetRow => ({ id: Math.random().toString(), session_id: "s", exercise_id: null, name: "Bench", target_reps: "5", position: 0, set_no: 1, weight_lb: 225, reps: 5, done: true, ...p });
const sess = (id: string, date: string, day: "upper" | "lower", sets: SetRow[], status: "done" | "active" = "done"): SessionWithSets => ({
  id, date, day, status, pre_done: [], post_done: [], refuel_done: [], bodyweight_lb: null, notes: "", started_at: `${date}T18:00:00Z`, finished_at: null, sets,
});

describe("split rotation", () => {
  it("starts on Upper and alternates from the last finished workout", () => {
    expect(nextDay([])).toBe("upper");
    expect(nextDay([sess("a", "2026-10-01", "upper", [])])).toBe("lower");
    expect(nextDay([sess("a", "2026-10-01", "upper", []), sess("b", "2026-10-03", "lower", [])])).toBe("upper");
  });
  it("ignores a workout still in progress", () => {
    expect(nextDay([sess("a", "2026-10-01", "upper", []), sess("b", "2026-10-03", "lower", [], "active")])).toBe("lower");
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
  it("counts volume from finished sets only", () => {
    expect(volume([set({ weight_lb: 100, reps: 10 }), set({ weight_lb: 100, reps: 10, done: false })])).toBe(1000);
  });
  it("converts lbs and kg both ways", () => {
    expect(toUnit(220.462, "kg")).toBe(100);
    expect(toUnit(fromUnit(102.5, "kg"), "kg")).toBe(102.5);
    expect(fmtWeight(315, "lb")).toBe("315 lb");
    expect(fmtWeight(null, "kg")).toBe("–");
  });
});

describe("PRs and progress", () => {
  const a = sess("a", "2026-10-01", "upper", [set({ weight_lb: 225, reps: 5 })]);
  const b = sess("b", "2026-10-03", "upper", [set({ weight_lb: 235, reps: 5 }), set({ name: "Row", weight_lb: 185, reps: 8 })]);
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
  it("builds sets from the split at current weights", () => {
    let i = 0;
    const sets = setsFromSplit(
      [
        { id: "e1", day: "upper", name: "Bench", sets: 3, reps: "6-8", weight_lb: 275, note: "", position: 0 },
        { id: "e2", day: "lower", name: "Squat", sets: 3, reps: "5", weight_lb: 365, note: "", position: 0 },
      ],
      "upper",
      "s1",
      () => `id${++i}`,
    );
    expect(sets).toHaveLength(3);
    expect(sets.every((s) => s.weight_lb === 275 && s.reps === 6 && !s.done)).toBe(true);
  });
});

describe("summary", () => {
  it("counts weeks in a row", () => {
    const s = summarize([sess("a", "2026-10-26", "upper", []), sess("b", "2026-10-20", "lower", []), sess("c", "2026-10-06", "upper", [])], "2026-11-01");
    expect(s.weekStreak).toBe(2);
    expect(s.thisWeek).toBe(1);
    expect(s.daysSinceLast).toBe(6);
  });
});
