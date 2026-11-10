import Link from "next/link";
import type { WeekCardData } from "@/lib/share-cards";
import { WeekShare } from "./share-cards";
import { Card, Empty } from "./ui";

/** This week at a glance, with the weekly recap picture to share or post. */
export function WeekRecap({ data, discord, filename }: { data: WeekCardData; discord: boolean; filename: string }) {
  return (
    <Card title={`This week · ${data.weekLabel}`}>
      {data.workouts.length ? (
        <ul className="mb-3 divide-y divide-line">
          {data.workouts.map((w) => (
            <li key={`${w.dateLabel}-${w.dayName}`} className="flex items-baseline justify-between gap-3 py-2">
              <span className="font-semibold">{w.dayName}</span>
              <span className="text-[14px] text-muted">
                {w.dateLabel} · {w.sets} sets
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty title="No workouts yet this week">
          <Link href="/workout" className="text-accent">
            Start one
          </Link>
        </Empty>
      )}
      <p className="mb-3 text-[14px] text-muted">
        {data.setsDone} sets · {data.volume} moved{data.rests ? ` · ${data.rests} rest ${data.rests === 1 ? "day" : "days"}` : ""}
        {data.prs.length ? ` · ${data.prs.length} new ${data.prs.length === 1 ? "PR" : "PRs"}` : ""}
      </p>
      <WeekShare data={data} filename={filename} discord={discord ? { title: `Weekly recap · ${data.weekLabel}` } : null} />
    </Card>
  );
}
