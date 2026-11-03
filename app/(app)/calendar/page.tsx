import type { Metadata } from "next";
import { CalendarView } from "@/components/calendar-view";
import { getContext, getSessions } from "@/lib/data";
import { todayIn } from "@/lib/time";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const ctx = await getContext();
  const today = todayIn(ctx.settings.timezone);
  const { m } = await searchParams;
  const month = m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) ? m : today.slice(0, 7);
  // Last real day of the month (asking for Nov 31 makes the database reject the whole query).
  const lastDay = new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0)).getUTCDate();
  const sessions = await getSessions(ctx, { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, "0")}` });
  return <CalendarView month={month} today={today} sessions={sessions} />;
}
