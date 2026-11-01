import { formatInTimeZone } from "date-fns-tz";

export const DEFAULT_TZ = "America/Denver";

export function todayIn(tz = DEFAULT_TZ): string {
  try {
    return formatInTimeZone(new Date(), tz, "yyyy-MM-dd");
  } catch {
    return formatInTimeZone(new Date(), DEFAULT_TZ, "yyyy-MM-dd");
  }
}

const utc = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));

export function addDays(dateStr: string, n: number): string {
  return new Date(utc(dateStr) + n * 86_400_000).toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((utc(b) - utc(a)) / 86_400_000);
}

/** 0 = Sunday. */
export function weekdayOf(dateStr: string): number {
  return new Date(utc(dateStr)).getUTCDay();
}

/** Monday of the week the date falls in. */
export function weekStart(dateStr: string): string {
  return addDays(dateStr, -((weekdayOf(dateStr) + 6) % 7));
}

export function isValidDateStr(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(utc(s)) && new Date(utc(s)).toISOString().slice(0, 10) === s;
}

export function longDate(dateStr: string): string {
  return new Date(utc(dateStr)).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function shortDate(dateStr: string): string {
  return new Date(utc(dateStr)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function minutesBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const m = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60_000);
  return Number.isFinite(m) && m >= 0 ? m : null;
}
