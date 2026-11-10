import { notFound } from "next/navigation";
import { CalendarView } from "@/components/calendar-view";
import { DashboardView } from "@/components/dashboard-view";
import { HistoryList } from "@/components/history-list";
import { Nav } from "@/components/nav";
import { NotesEditor } from "@/components/notes-editor";
import { SplitChoice, StartOverForm, UnitsPicker } from "@/components/settings-forms";
import { SplitEditor } from "@/components/split-editor";
import { StartWorkout } from "@/components/start-workout";
import { WorkoutEditor } from "@/components/workout-editor";
import { allTimeBests, loggedNames, nextDay, prsIn, progressFor, summarize } from "@/lib/lift";
import { previewData } from "@/lib/preview-data";
import { todayIn } from "@/lib/time";
import type { Units } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Local design check with example data. Only works when PREVIEW_MODE=1. */
export default async function Preview({ params, searchParams }: { params: Promise<{ view: string }>; searchParams: Promise<{ u?: string }> }) {
  if (process.env.PREVIEW_MODE !== "1") notFound();
  const { view } = await params;
  const units: Units = (await searchParams).u === "kg" ? "kg" : "lb";
  const today = todayIn();
  const d = previewData(today);
  const all = [d.live, ...d.sessions];
  const body = (() => {
    switch (view) {
      case "home":
        return (
          <DashboardView name="@ICT_Jimmy" summary={summarize(all, today)} next={nextDay(d.sessions, d.days)?.name ?? null} nextCount={nextDay(d.sessions, d.days)?.exerciseIds.length ?? 0} live={null} recent={d.sessions.slice(0, 5)} bests={allTimeBests(all)} series={Object.fromEntries(loggedNames(all).map((n) => [n, progressFor(all, n)]))} units={units} />
        );
      case "start":
        return <StartWorkout next={nextDay(d.sessions, d.days)} days={d.days} exercises={d.exercises} units={units} restToday={false} preview />;
      case "workout":
        return <WorkoutEditor session={d.live} split={d.exercises} checklist={d.checklist} units={units} preview />;
      case "done":
        return <WorkoutEditor session={d.sessions[0]} split={d.exercises} checklist={d.checklist} units={units} prs={prsIn(d.sessions[0], all)} justFinished nextName={nextDay(d.sessions, d.days)?.name} share={{ handle: "ICT_Jimmy", discord: true }} preview />;
      case "split":
        return <SplitEditor days={d.days} exercises={d.exercises} units={units} preview />;
      case "notes":
        return <NotesEditor notes={d.notes} checklist={d.checklist} preview />;
      case "history":
        return <HistoryList sessions={d.sessions} units={units} />;
      case "calendar":
        return <CalendarView month={today.slice(0, 7)} today={today} sessions={d.sessions} share={{ handle: "ICT_Jimmy", discord: true }} />;
      case "choice":
        return <SplitChoice />;
      case "split-empty":
        return <SplitEditor days={[]} exercises={[]} units={units} preview />;
      case "startover":
        return <StartOverForm current="template" />;
      case "units":
        return <UnitsPicker current={null} first />;
      default:
        notFound();
    }
  })();
  return (
    <div className="lg:pl-56">
      <Nav email="@ICT_Jimmy" live={view === "workout"} />
      <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 lg:pb-16">{body}</main>
    </div>
  );
}
