import { FirstRun } from "@/components/first-run";
import { DashboardView } from "@/components/dashboard-view";
import { WeekRecap } from "@/components/week-recap";
import { getChecklist, getContext, getDays, getExercises, getNotes, getSessions } from "@/lib/data";
import { allTimeBests, isWorkout, loggedNames, nextDay, progressFor, prsIn, setsDone, summarize, volume } from "@/lib/lift";
import { LIFT_WEBHOOK_KEY, getSiteSetting } from "@/lib/site-settings";
import { addDays, shortDate, todayIn, weekStart } from "@/lib/time";
import { fmtBig, fmtWeight } from "@/lib/units";

export default async function HomePage() {
  const ctx = await getContext();
  const units = ctx.settings.units ?? "lb";
  const today = todayIn(ctx.settings.timezone);
  const [sessions, days, exercises, notes, checklist, hook] = await Promise.all([getSessions(ctx), getDays(ctx), getExercises(ctx), getNotes(ctx), getChecklist(ctx), getSiteSetting(ctx, LIFT_WEBHOOK_KEY)]);
  // Progress and best lifts only cover exercises still in the split.
  const inSplit = new Set(days.flatMap((d) => d.exerciseIds).map((id) => exercises.find((e) => e.id === id)?.name.trim().toLowerCase()).filter(Boolean));
  const current = (name: string) => inSplit.has(name.trim().toLowerCase());
  const next = nextDay(sessions, days);
  const series = Object.fromEntries(loggedNames(sessions).filter(current).map((n) => [n, progressFor(sessions, n)]));

  // This week, Monday to today.
  const wk = weekStart(today);
  const inWeek = sessions.filter((s) => s.date >= wk && s.date <= today);
  const weekWorkouts = inWeek.filter(isWorkout).sort((a, b) => a.date.localeCompare(b.date));
  const prs = new Map<string, string>();
  for (const s of weekWorkouts) for (const p of prsIn(s, sessions)) prs.set(p.name, `${fmtWeight(p.weight, units)} x ${p.reps}`);
  const weekLabel = `${shortDate(wk)} to ${shortDate(addDays(wk, 6))}`;

  const steps = [
    { label: "Pick lbs or kg", href: "/settings", done: !!ctx.settings.units },
    { label: "Set up your split", href: "/split", done: days.length > 0 },
    { label: "Fill in your weights", href: "/split", done: exercises.some((e) => e.weight_lb !== null) },
    { label: "Write your key notes and checklists", href: "/notes", done: notes.some((n) => n.body.trim()) || checklist.length > 0 },
    { label: "Log your first workout", href: "/workout", done: sessions.some(isWorkout) },
  ];

  return (
    <DashboardView
      name={ctx.guest ? "Guest" : ctx.username ? `@${ctx.username}` : "Lifter"}
      firstRun={!ctx.guest && <FirstRun steps={steps} />}
      week={
        <WeekRecap
          filename={`week-${wk}.png`}
          discord={!!hook}
          data={{
            weekLabel,
            workouts: weekWorkouts.map((s) => ({ dateLabel: shortDate(s.date), dayName: s.day_name || "Workout", sets: setsDone(s.sets) })),
            rests: inWeek.filter((s) => s.rest).length,
            setsDone: weekWorkouts.reduce((t, s) => t + setsDone(s.sets), 0),
            volume: fmtBig(weekWorkouts.reduce((t, s) => t + volume(s.sets), 0), units),
            prs: [...prs.entries()].map(([name, text]) => ({ name, text })),
            handle: ctx.guest ? "" : (ctx.username ?? ""),
          }}
        />
      }
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
