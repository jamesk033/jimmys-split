import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { WorkoutEditor } from "@/components/workout-editor";
import { getChecklist, getContext, getDays, getExercises, getSessions } from "@/lib/data";
import { nextDay, prsIn } from "@/lib/lift";
import { LIFT_WEBHOOK_KEY, getSiteSetting } from "@/lib/site-settings";

export const metadata: Metadata = { title: "Workout" };

export default async function WorkoutDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string }> }) {
  const { id } = await params;
  const { done } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const ctx = await getContext();
  const [all, exercises, checklist, days] = await Promise.all([getSessions(ctx), getExercises(ctx), getChecklist(ctx), getDays(ctx)]);
  const session = all.find((s) => s.id === id);
  if (!session) notFound();
  if (session.status === "active" || session.rest) redirect(session.rest ? "/history" : "/workout");
  return <WorkoutEditor key={session.id} session={session} split={exercises} checklist={checklist} units={ctx.settings.units ?? "lb"} prs={prsIn(session, all)} justFinished={done === "1"} nextName={nextDay(all, days)?.name} preview={ctx.guest} tabOrder={ctx.settings.tab_order} share={{ handle: ctx.guest ? "" : (ctx.username ?? ""), discord: !!(await getSiteSetting(ctx, LIFT_WEBHOOK_KEY)) }} />;
}
