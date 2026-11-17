import { describe, expect, it } from "vitest";
import { liftConditions } from "@/lib/conditions";
import type { ChecklistItem, SessionWithSets } from "@/lib/types";

const ses = (id: string, date: string, weight: number, pre: string[] = [], refuel: string[] = []): SessionWithSets => ({
  id,
  date,
  day_id: null,
  day_name: "A Upper 1",
  rest: false,
  status: "done",
  pre_done: pre,
  post_done: [],
  refuel_done: refuel,
  bodyweight_lb: null,
  notes: "",
  started_at: `${date}T15:00:00Z`,
  finished_at: null,
  sets: [{ id: `${id}-1`, session_id: id, exercise_id: null, name: "Bench", target_reps: "4-8", position: 0, set_no: 1, weight_lb: weight, reps: 5, done: true }],
});
const list: ChecklistItem[] = [
  { id: "p", kind: "pre", body: "Caffeine", position: 0 },
  { id: "r", kind: "refuel", body: "Protein shake", position: 0 },
];

describe("lifting conditions", () => {
  const data = liftConditions(
    [
      ses("1", "2026-11-01", 200),
      ses("2", "2026-11-03", 210, ["Caffeine"], ["Protein shake"]), // PR
      ses("3", "2026-11-05", 205, [], ["Protein shake"]), // flat
      ses("4", "2026-11-07", 215, ["Caffeine"]), // PR, refuel before was done
      ses("5", "2026-11-09", 215, []), // flat
      ses("6", "2026-11-11", 220, ["Caffeine"]), // PR
    ],
    list,
  );
  it("skips the first workout (nothing to beat) and counts PR days", () => {
    expect(data.total).toBe(5);
    expect(data.prDays).toBe(3);
  });
  it("finds pre-lift items that show up on PR days", () => {
    const g = data.groups.find((x) => x.title === "Pre-lift checklist")!;
    expect(g.rows.find((r) => r.label === "Caffeine: done")).toMatchObject({ n: 3, prs: 3 });
    expect(g.rows.find((r) => r.label === "Caffeine: missed")).toMatchObject({ n: 2, prs: 0 });
    expect(data.edges[0].label).toBe("Caffeine: done");
    expect(data.leaks.some((r) => r.label === "Caffeine: missed")).toBe(false); // only 2 workouts
  });
  it("counts refueling against the next workout", () => {
    const g = data.groups.find((x) => x.title === "Refueling")!;
    expect(g.rows.find((r) => r.label === "Protein shake: done")).toMatchObject({ n: 2, prs: 1 });
  });
  it("buckets rest before", () => {
    const g = data.groups.find((x) => x.title === "Rest before")!;
    expect(g.rows).toEqual([expect.objectContaining({ label: "1 rest day", n: 5 })]);
  });
});
