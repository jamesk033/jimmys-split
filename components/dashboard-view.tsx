import Link from "next/link";
import type { ReactNode } from "react";
import type { Best, Summary } from "@/lib/lift";
import { setsDone, volume } from "@/lib/lift";
import { shortDate } from "@/lib/time";
import { isLower, type SessionWithSets, type Units } from "@/lib/types";
import { fmtBig, fmtWeight } from "@/lib/units";
import { IconCalendarDay, IconDumbbell, IconFlame, IconScale, IconTrendUp, IconTrophy } from "./icons";
import { ProgressChart, type ProgressSeries } from "./progress-chart";
import { Badge, Card, Empty, PageHeader, Stat, StatGrid, cx } from "./ui";

export function DashboardView({
  name,
  summary,
  next,
  nextCount,
  live,
  recent,
  bests,
  series,
  units,
  firstRun,
  week,
}: {
  firstRun?: ReactNode;
  week?: ReactNode;
  name: string;
  summary: Summary;
  next: string | null;
  nextCount: number;
  live: SessionWithSets | null;
  recent: SessionWithSets[];
  bests: Best[];
  series: ProgressSeries;
  units: Units;
}) {
  const since = summary.daysSinceLast;
  return (
    <div className="grid gap-4">
      <PageHeader eyebrow="Welcome back" title={name} />
      {firstRun}

      <Link
        href="/workout"
        className={cx("group flex items-center justify-between gap-4 rounded-2xl border p-5 transition", live ? "border-win/50 bg-win/10 hover:bg-win/15" : "border-accent/50 bg-accent/10 hover:bg-accent/15")}
      >
        <div className="min-w-0">
          <div className="text-[13px] font-semibold uppercase tracking-wider text-muted">{live ? "In progress" : "Next up"}</div>
          <div className="mt-0.5 text-[26px] font-bold leading-tight">{live ? live.day_name : (next ?? "Set up your split")}</div>
          <div className="mt-1 text-[14px] text-muted">
            {live
              ? `${setsDone(live.sets)} of ${live.sets.length} sets done. Tap to keep going.`
              : `${nextCount} exercises. ${since === null ? "Your first workout." : since === 0 ? "Already trained today." : `Last workout ${since} day${since === 1 ? "" : "s"} ago.`}`}
          </div>
        </div>
        <span className={cx("grid h-14 w-14 shrink-0 place-items-center rounded-2xl", live ? "bg-win text-black" : "bg-accent text-accent-ink")}>
          <IconDumbbell width={28} height={28} />
        </span>
      </Link>

      <StatGrid>
        <Stat label="This week" value={summary.thisWeek} sub="workouts" icon={IconCalendarDay} />
        <Stat label="Week streak" value={summary.weekStreak} sub={summary.weekStreak === 1 ? "week in a row" : "weeks in a row"} tone={summary.weekStreak ? "accent" : undefined} icon={IconFlame} />
        <Stat label="Moved this week" value={fmtBig(summary.weekVolume, units)} sub="weight x reps" icon={IconTrendUp} />
        <Stat label="Bodyweight" value={summary.lastBodyweight ? fmtWeight(summary.lastBodyweight, units) : "–"} sub="last logged" icon={IconScale} />
      </StatGrid>

      {week}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card title="Progress">
          <ProgressChart series={series} units={units} />
        </Card>
        <Card title="Best lifts" action={<IconTrophy className="text-amber-300" />}>
          {bests.length ? (
            <ul className="divide-y divide-line">
              {bests.slice(0, 8).map((b) => (
                <li key={b.name} className="flex items-baseline justify-between gap-3 py-2">
                  <span className="min-w-0 truncate font-semibold">{b.name}</span>
                  <span className="shrink-0 text-right text-[14px] text-muted">
                    {fmtWeight(b.weight, units, false)} x {b.reps} · <span className="font-semibold text-ink">{fmtWeight(b.e1rm, units)}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="No lifts yet" />
          )}
          {bests.length > 0 && <p className="mt-2 text-[12px] text-muted">Best set and estimated one-rep max (sets of 12 or fewer).</p>}
        </Card>
      </div>

      <Card
        title="Recent workouts"
        action={
          <Link href="/history" className="text-[13px] text-accent">
            See all
          </Link>
        }
      >
        {recent.length ? (
          <ul className="divide-y divide-line">
            {recent.map((s) => (
              <li key={s.id}>
                <Link href={`/history/${s.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-accent">
                  <span className="flex items-center gap-2">
                    <Badge tone={s.rest ? "neutral" : isLower(s.day_name) ? "win" : "accent"}>{s.day_name || "Workout"}</Badge>
                    <span>{shortDate(s.date)}</span>
                  </span>
                  <span className="text-[14px] text-muted">
                    {s.rest ? "Rest day" : `${setsDone(s.sets)} sets · ${fmtBig(volume(s.sets), units)}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="No workouts yet">Hit the Workout button to start your first one.</Empty>
        )}
      </Card>
    </div>
  );
}
