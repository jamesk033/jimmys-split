import Link from "next/link";
import { groupSets, setsDone, volume } from "@/lib/lift";
import { longDate, minutesBetween } from "@/lib/time";
import { isLower, type SessionWithSets, type Units } from "@/lib/types";
import { fmtBig, fmtWeight } from "@/lib/units";
import { Badge, Card, Empty } from "./ui";

/** Every workout, newest first, with the top set of each exercise. */
export function HistoryList({ sessions, units }: { sessions: SessionWithSets[]; units: Units }) {
  if (!sessions.length) return <Empty title="No workouts yet">Finished workouts show up here.</Empty>;
  return (
    <ul className="grid gap-3">
      {sessions.map((s) => {
        const mins = minutesBetween(s.started_at, s.finished_at);
        if (s.rest)
          return (
            <li key={s.id} className="flex items-center gap-2 rounded-2xl border border-dashed border-line px-4 py-3 text-[14px] text-muted">
              <Badge>Rest</Badge>
              {longDate(s.date)}
            </li>
          );
        return (
          <li key={s.id}>
            <Link href={`/history/${s.id}`} className="block rounded-2xl transition hover:ring-1 hover:ring-accent/50">
              <Card>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge tone={isLower(s.day_name) ? "win" : "accent"}>{s.day_name || "Workout"}</Badge>
                    <span className="font-semibold">{longDate(s.date)}</span>
                    {s.status === "active" && <Badge tone="warn">In progress</Badge>}
                  </div>
                  <span className="text-[13px] text-muted">
                    {setsDone(s.sets)}/{s.sets.length} sets · {fmtBig(volume(s.sets), units)}
                    {mins !== null && mins < 600 ? ` · ${mins} min` : ""}
                  </span>
                </div>
                <ul className="grid gap-0.5 text-[14px]">
                  {groupSets(s.sets).map((g) => {
                    const done = g.sets.filter((x) => x.done && x.weight_lb !== null);
                    const top = done.sort((a, b) => (b.weight_lb ?? 0) - (a.weight_lb ?? 0))[0];
                    return (
                      <li key={g.key} className="flex justify-between gap-3">
                        <span className="truncate text-muted">{g.name}</span>
                        <span className="shrink-0 tabular-nums">{top ? `${fmtWeight(top.weight_lb, units)} x ${top.reps ?? "?"}` : "skipped"}</span>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
