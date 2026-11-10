import type { Metadata } from "next";
import { StartWorkout } from "@/components/start-workout";
import { WorkoutEditor } from "@/components/workout-editor";
import { getChecklist, getContext, getDays, getExercises, getSessions } from "@/lib/data";
import { nextDay } from "@/lib/lift";
import { normalizeSession } from "@/lib/types";
import { todayIn } from "@/lib/time";

export const metadata: Metadata = { title: "Workout" };

export default async function WorkoutPage() {
  const ctx = await getContext();
  const units = ctx.settings.units ?? "lb";
  const [recent, exercises, days] = await Promise.all([
    ctx.guest ? getSessions(ctx) : ctx.supabase.from("lift_sessions").select("*").order("date", { ascending: false }).order("started_at", { ascending: false }).limit(60).then(({ data }) => (data ?? []).map(normalizeSession)),
    getExercises(ctx),
    getDays(ctx),
  ]);
  const rows = recent;
  const live = rows.find((s) => s.status === "active");
  if (live) {
    const [[session], checklist] = await Promise.all([getSessions(ctx, { id: live.id }), getChecklist(ctx)]);
    return <WorkoutEditor key={session.id} session={session} split={exercises} checklist={checklist} units={units} tabOrder={ctx.settings.tab_order} preview={ctx.guest} />;
  }
  const today = todayIn(ctx.settings.timezone);
  return <StartWorkout next={nextDay(rows, days)} days={days} exercises={exercises} units={units} restToday={rows.some((r) => r.rest && r.date === today)} preview={ctx.guest} />;
}
