import { describe, expect, it } from "vitest";
import { VERSES, verseDate, verseIndex, verseOfDay } from "@/lib/verse";

describe("daily verse", () => {
  it("has the 90 verses in order", () => {
    expect(VERSES).toHaveLength(90);
    expect(VERSES[0]).toBe("I can do all things through Christ which strengtheneth me.\nPhilippians 4:13 (KJV)");
    expect(VERSES[89]).toBe("Not slothful in business; fervent in spirit; serving the Lord.\nRomans 12:11 (KJV)");
    expect(VERSES.join("")).not.toMatch(/[\u2018\u2019\u201c\u201d]/);
  });
  it("shows James 1:2-3 on 2026-11-06", () => {
    expect(verseIndex("2026-11-06")).toBe(63);
    expect(VERSES[63]).toContain("James 1:2-3 (KJV)");
  });
  it("uses the New York date and changes at midnight there", () => {
    // 11:30 PM Nov 5 in New York (04:30 UTC Nov 6) is still Nov 5.
    expect(verseDate(new Date("2026-11-06T04:30:00Z"))).toBe("2026-11-05");
    expect(verseDate(new Date("2026-11-06T05:00:00Z"))).toBe("2026-11-06");
    expect(verseOfDay(new Date("2026-11-06T15:00:00Z")).reference).toBe("James 1:2-3 (KJV)");
    expect(verseIndex("2026-11-07")).toBe(64);
  });
});
