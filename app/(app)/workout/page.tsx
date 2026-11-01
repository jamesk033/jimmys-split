import type { Metadata } from "next";
import { StartWorkout } from "@/components/start-workout";
import { WorkoutEditor } from "@/components/workout-editor";
import { getChecklist, getContext, getExercises, getSessions } from "@/lib/data";
import { nextDay } from "@/lib/lift";

export const metadata: Metadata = { title: "Workout" };

export default async function WorkoutPage() {
  const ctx = await getContext();
  const units = ctx.settings.units ?? "lb";
  const [{ data: recent }, exercises] = await Promise.all([
    ctx.supabase.from("lift_sessions").select("id,day,status,date,started_at").order("date", { ascending: false }).order("started_at", { ascending: false }).limit(20),
    getExercises(ctx),
  ]);
  const live = (recent ?? []).find((s) => s.status === "active");
  if (live) {
    const [[session], checklist] = await Promise.all([getSessions(ctx, { id: live.id }), getChecklist(ctx)]);
    return <WorkoutEditor key={session.id} session={session} split={exercises} checklist={checklist} units={units} />;
  }
  const rows = (recent ?? []) as { day: "upper" | "lower"; status: "active" | "done"; date: string; started_at: string }[];
  return <StartWorkout suggested={nextDay(rows)} exercises={exercises} units={units} lastDate={rows.find((r) => r.status === "done")?.date ?? null} />;
}
