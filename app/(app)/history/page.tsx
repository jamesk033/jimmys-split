import type { Metadata } from "next";
import { HistoryList } from "@/components/history-list";
import { PageHeader } from "@/components/ui";
import { getContext, getSessions } from "@/lib/data";

export const metadata: Metadata = { title: "History" };

export default async function HistoryPage() {
  const ctx = await getContext();
  const sessions = await getSessions(ctx);
  return (
    <>
      <PageHeader title="History" sub={`${sessions.filter((s) => s.status === "done").length} workouts`} />
      <HistoryList sessions={sessions} units={ctx.settings.units ?? "lb"} />
    </>
  );
}
