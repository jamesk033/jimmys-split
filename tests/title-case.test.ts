import { describe, expect, it } from "vitest";
import { titleCase } from "@/lib/title-case";

describe("titleCase", () => {
  it("capitalizes important words, keeps small words lower case", () => {
    expect(titleCase("watch both NQ1! & ES1! for discrepancies.")).toBe("Watch Both NQ1! & ES1! for Discrepancies.");
    expect(titleCase("the day before cpi")).toBe("The Day Before Cpi");
    expect(titleCase("sweep ITH / ITL in HTF FVG")).toBe("Sweep ITH / ITL in HTF FVG");
  });
  it("leaves iFVG, numbers, times and links alone", () => {
    expect(titleCase("LTF iFVG (or strong CISD) w/ V-shape delivery in under 5 candles.")).toBe("LTF iFVG (or Strong CISD) w/ V-Shape Delivery in Under 5 Candles.");
    expect(titleCase(".5 CE of current LTF range")).toBe(".5 CE of Current LTF Range");
    expect(titleCase("9:30 (judas swing)")).toBe("9:30 (Judas Swing)");
    expect(titleCase("compare volume https://www.cmegroup.com/x")).toBe("Compare Volume https://www.cmegroup.com/x");
  });
  it("starts a new phrase after a colon", () => {
    expect(titleCase("2 losses: done for day.")).toBe("2 Losses: Done for Day.");
    expect(titleCase("under 20: safe, risk higher")).toBe("Under 20: Safe, Risk Higher");
    expect(titleCase("don't trade non-trading days.")).toBe("Don't Trade Non-Trading Days.");
  });
});

describe("titleCase numbers", () => {
  it("leaves times and timeframes as typed", () => {
    expect(titleCase("time: 9:30am")).toBe("Time: 9:30am");
    expect(titleCase("10am reversal")).toBe("10am Reversal");
    expect(titleCase("trail past significant 1m swing points")).toBe("Trail Past Significant 1m Swing Points");
  });
});
