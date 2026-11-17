import type { Metadata } from "next";
import { ConditionsView } from "@/components/conditions-view";
import { PageHeader } from "@/components/ui";
import { liftConditions } from "@/lib/conditions";
import { getChecklist, getContext, getSessions } from "@/lib/data";

export const metadata: Metadata = { title: "Conditions" };

export default async function ConditionsPage() {
  const ctx = await getContext();
  const [sessions, checklist] = await Promise.all([getSessions(ctx), getChecklist(ctx)]);
  return (
    <>
      <PageHeader title="Conditions" sub="What shows up on your PR days compared with your flat days" />
      <ConditionsView data={liftConditions(sessions, checklist)} />
    </>
  );
}
