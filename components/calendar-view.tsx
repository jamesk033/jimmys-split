import Link from "next/link";
import { setsDone } from "@/lib/lift";
import { addDays, weekdayOf } from "@/lib/time";
import { DAY_LABEL, type SessionWithSets } from "@/lib/types";
import { IconChevronLeft, IconChevronRight } from "./icons";
import { Card, PageHeader, cx } from "./ui";

const shiftMonth = (m: string, n: number) => {
  const d = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1 + n, 1));
  return d.toISOString().slice(0, 7);
};

/** Month grid: purple = Upper, green = Lower. Tap a day to open the workout. */
export function CalendarView({ month, today, sessions }: { month: string; today: string; sessions: SessionWithSets[] }) {
  const first = `${month}-01`;
  const days = new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0)).getUTCDate();
  const lead = (weekdayOf(first) + 6) % 7; // weeks start Monday
  const byDate = new Map<string, SessionWithSets[]>();
  for (const s of sessions) byDate.set(s.date, [...(byDate.get(s.date) ?? []), s]);
  const label = new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7) - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const inMonth = sessions.filter((s) => s.date.startsWith(month) && s.status === "done");
  const upper = inMonth.filter((s) => s.day === "upper").length;

  return (
    <div className="grid gap-4">
      <PageHeader
        title={label}
        sub={`${inMonth.length} workouts · ${upper} Upper · ${inMonth.length - upper} Lower`}
        action={
          <div className="flex gap-1">
            <Link href={`/calendar?m=${shiftMonth(month, -1)}`} aria-label="Previous month" className="grid h-11 w-11 place-items-center rounded-lg border border-line text-muted hover:text-ink">
              <IconChevronLeft />
            </Link>
            <Link href={`/calendar?m=${shiftMonth(month, 1)}`} aria-label="Next month" className="grid h-11 w-11 place-items-center rounded-lg border border-line text-muted hover:text-ink">
              <IconChevronRight />
            </Link>
          </div>
        }
      />
      <Card className="p-2 sm:p-4">
        <div className="grid grid-cols-7 gap-1 pb-1 text-center text-[11px] uppercase tracking-wide text-muted">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: lead }, (_, i) => (
            <span key={`b${i}`} />
          ))}
          {Array.from({ length: days }, (_, i) => {
            const date = addDays(first, i);
            const s = byDate.get(date)?.[0];
            const cls = cx(
              "flex aspect-square min-h-11 flex-col items-center justify-center rounded-lg border text-[13px] tabular-nums",
              s ? (s.day === "upper" ? "border-accent/50 bg-accent/15" : "border-win/50 bg-win/15") : "border-line/60 text-muted",
              date === today && "ring-2 ring-ink/70",
            );
            const inner = (
              <>
                <span>{i + 1}</span>
                {s && <span className={cx("text-[10px] font-semibold uppercase sm:text-[11px]", s.day === "upper" ? "text-accent" : "text-win")}>{DAY_LABEL[s.day]}</span>}
                {s && <span className="hidden text-[10px] text-muted sm:block">{setsDone(s.sets)} sets</span>}
              </>
            );
            return s ? (
              <Link key={date} href={`/history/${s.id}`} className={cx(cls, "hover:brightness-125")} aria-label={`${date}: ${DAY_LABEL[s.day]}`}>
                {inner}
              </Link>
            ) : (
              <div key={date} className={cls}>
                {inner}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
