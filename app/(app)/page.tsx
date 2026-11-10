import { DashboardView } from "@/components/dashboard-view";
import { getContext, getDays, getExercises, getSessions } from "@/lib/data";
import { allTimeBests, loggedNames, nextDay, progressFor, summarize } from "@/lib/lift";
import { todayIn } from "@/lib/time";

export default async function HomePage() {
  const ctx = await getContext();
  const units = ctx.settings.units ?? "lb";
  const today = todayIn(ctx.settings.timezone);
  const [sessions, days, exercises] = await Promise.all([getSessions(ctx), getDays(ctx), getExercises(ctx)]);
  // Progress and best lifts only cover exercises still in the split.
  const inSplit = new Set(days.flatMap((d) => d.exerciseIds).map((id) => exercises.find((e) => e.id === id)?.name.trim().toLowerCase()).filter(Boolean));
  const current = (name: string) => inSplit.has(name.trim().toLowerCase());
  const next = nextDay(sessions, days);
  const series = Object.fromEntries(loggedNames(sessions).filter(current).map((n) => [n, progressFor(sessions, n)]));
  return (
    <DashboardView
      name={ctx.username ? `@${ctx.username}` : "Lifter"}
      summary={summarize(sessions, today)}
      next={next?.name ?? null}
      nextCount={next?.exerciseIds.length ?? 0}
      live={sessions.find((s) => s.status === "active") ?? null}
      recent={sessions.filter((s) => s.status === "done").slice(0, 6)}
      bests={allTimeBests(sessions).filter((b) => current(b.name))}
      series={series}
      units={units}
    />
  );
}
