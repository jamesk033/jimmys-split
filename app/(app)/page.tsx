import { DailyVerse } from "@/components/daily-verse";
import { DashboardView } from "@/components/dashboard-view";
import { getContext, getDays, getSessions } from "@/lib/data";
import { allTimeBests, loggedNames, nextDay, progressFor, summarize } from "@/lib/lift";
import { todayIn } from "@/lib/time";

export default async function HomePage() {
  const ctx = await getContext();
  const units = ctx.settings.units ?? "lb";
  const today = todayIn(ctx.settings.timezone);
  const [sessions, days] = await Promise.all([getSessions(ctx), getDays(ctx)]);
  const next = nextDay(sessions, days);
  const series = Object.fromEntries(loggedNames(sessions).map((n) => [n, progressFor(sessions, n)]));
  return (
    <DashboardView
      name={ctx.username ? `@${ctx.username}` : "Lifter"}
      verse={<DailyVerse />}
      summary={summarize(sessions, today)}
      next={next?.name ?? null}
      nextCount={next?.exerciseIds.length ?? 0}
      live={sessions.find((s) => s.status === "active") ?? null}
      recent={sessions.filter((s) => s.status === "done").slice(0, 6)}
      bests={allTimeBests(sessions)}
      series={series}
      units={units}
    />
  );
}
