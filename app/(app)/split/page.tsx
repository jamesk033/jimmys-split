import type { Metadata } from "next";
import { SplitEditor } from "@/components/split-editor";
import { getContext, getExercises } from "@/lib/data";

export const metadata: Metadata = { title: "Split" };

export default async function SplitPage() {
  const ctx = await getContext();
  return <SplitEditor exercises={await getExercises(ctx)} units={ctx.settings.units ?? "lb"} />;
}
