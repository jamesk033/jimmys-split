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
