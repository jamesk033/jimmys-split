import { DailyVerse } from "@/components/daily-verse";
import { DashboardView } from "@/components/dashboard-view";
import { getContext, getExercises, getSessions } from "@/lib/data";
import { allTimeBests, loggedNames, nextDay, progressFor, summarize } from "@/lib/lift";
import { todayIn } from "@/lib/time";

export default async function HomePage() {
  const ctx = await getContext();
  const units = ctx.settings.units ?? "lb";
  const today = todayIn(ctx.settings.timezone);
  const [sessions, exercises] = await Promise.all([getSessions(ctx), getExercises(ctx)]);
  const next = nextDay(sessions);
  const series = Object.fromEntries(loggedNames(sessions).map((n) => [n, progressFor(sessions, n)]));
  return (
    <DashboardView
      name={ctx.username ? `@${ctx.username}` : "Lifter"}
      verse={<DailyVerse date={today} />}
      summary={summarize(sessions, today)}
      next={next}
      nextCount={exercises.filter((e) => e.day === next).length}
      live={sessions.find((s) => s.status === "active") ?? null}
      recent={sessions.filter((s) => s.status === "done").slice(0, 5)}
      bests={allTimeBests(sessions)}
      series={series}
      units={units}
    />
  );
}
