import { describe, expect, it } from "vitest";
import { parseExerciseLine, parseSplit } from "@/lib/import";

describe("paste-in split", () => {
  it("reads muscle, exercise and equipment", () => {
    expect(parseExerciseLine("Back - wide-grip lat pulldown - strap")).toEqual({ muscle: "Back", name: "Wide-grip lat pulldown", equipment: "strap", weight: null, reps: null });
    expect(parseExerciseLine("Back - uni. seated low row mach.-->kelso shrug - strap")?.name).toBe("Uni. seated low row mach.-->kelso shrug");
    expect(parseExerciseLine("Quad - hack squat - belt, flat shoes")?.equipment).toBe("belt, flat shoes");
    expect(parseExerciseLine("Pull-ups")).toEqual({ muscle: "", name: "Pull-ups", equipment: "", weight: null, reps: null });
  });
  it("takes an optional weight and rep range after a bar", () => {
    expect(parseExerciseLine("Back - pulldown - strap | 260 | 4-8")).toMatchObject({ weight: 260, reps: "4-8" });
    expect(parseExerciseLine("Calf - calf raise | 540lbs")).toMatchObject({ weight: 540, reps: null });
  });
  it("splits days on blank lines and drops times from day names", () => {
    const days = parseSplit("A Upper 1 - 80 mins\nBack - pulldown - strap\n1. Bicep - curl\n\n\nA Lower 1:\nQuad - hack squat\n");
    expect(days.map((d) => d.name)).toEqual(["A Upper 1", "A Lower 1"]);
    expect(days[0].exercises.map((e) => e.name)).toEqual(["Pulldown", "Curl"]);
  });
});

describe("edit split as text", () => {
  it("turns the split into text and back without losing anything", async () => {
    const { splitToText } = await import("@/lib/import");
    const ex = [
      { id: "a", muscle: "Back", name: "Wide-grip lat pulldown", equipment: "strap", weight: 260, reps: "4-8" },
      { id: "b", muscle: "", name: "Dragon flags", equipment: "", weight: null, reps: "4-8" },
      { id: "c", muscle: "", name: "Farmer carry", equipment: "straps", weight: 100, reps: "5" },
      { id: "d", muscle: "Erector", name: "RDL", equipment: "strap, belt", weight: 415, reps: "4-6" },
    ];
    const text = splitToText([{ name: "A Upper 1", exerciseIds: ["a", "b", "c"] }, { name: "B Lower 1", exerciseIds: ["d"] }], ex);
    const back = parseSplit(text);
    expect(back.map((d) => d.name)).toEqual(["A Upper 1", "B Lower 1"]);
    expect(back[0].exercises).toEqual([
      { muscle: "Back", name: "Wide-grip lat pulldown", equipment: "strap", weight: 260, reps: "4-8" },
      { muscle: "", name: "Dragon flags", equipment: "", weight: null, reps: "4-8" },
      { muscle: "", name: "Farmer carry", equipment: "straps", weight: 100, reps: "5" },
    ]);
    expect(back[1].exercises[0]).toEqual({ muscle: "Erector", name: "RDL", equipment: "strap, belt", weight: 415, reps: "4-6" });
  });
});
