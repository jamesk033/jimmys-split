import type { Metadata } from "next";
import { SplitEditor } from "@/components/split-editor";
import { getContext, getDays, getExercises } from "@/lib/data";

export const metadata: Metadata = { title: "Split" };

export default async function SplitPage() {
  const ctx = await getContext();
  const [days, exercises] = await Promise.all([getDays(ctx), getExercises(ctx)]);
  return <SplitEditor days={days} exercises={exercises} units={ctx.settings.units ?? "lb"} />;
}
