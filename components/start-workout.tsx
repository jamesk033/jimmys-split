"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { logRestDay, startWorkout } from "@/app/actions/lift";
import type { Exercise, Units, WorkoutDay } from "@/lib/types";
import { fmtWeight } from "@/lib/units";
import { Badge, Button, Card, Empty, Label, PageHeader, Select } from "./ui";

export function StartWorkout({
  next,
  days,
  exercises,
  units,
  restToday,
  preview = false,
}: {
  next: WorkoutDay | null;
  days: WorkoutDay[];
  exercises: Exercise[];
  units: Units;
  restToday: boolean;
  preview?: boolean;
}) {
  const router = useRouter();
  const [dayId, setDayId] = useState(next?.id ?? "");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const day = days.find((d) => d.id === dayId);
  const list = (day?.exerciseIds ?? []).map((id) => byId.get(id)).filter((e): e is Exercise => !!e);

  if (!next || !days.length)
    return (
      <Empty title="No workout days yet">
        <Link href="/split" className="text-accent">
          Set up your split
        </Link>
      </Empty>
    );

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setErr("");
      const res = await fn();
      if (!res.ok) return setErr(res.error ?? "Try again.");
      router.refresh();
    });

  return (
    <div className="grid gap-4">
      <PageHeader eyebrow={`Day ${days.findIndex((d) => d.id === next.id) + 1} of ${days.length} in the rotation`} title={`Next up: ${next.name}`} sub="Rest when needed. The rotation picks up where you left off." />

      <div>
        <Label htmlFor="day">Workout</Label>
        <Select data-guest-ok id="day" value={dayId} onChange={(e) => setDayId(e.target.value)} className="sm:max-w-xs">
          {days.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
              {d.id === next.id ? " (next)" : ""}
            </option>
          ))}
        </Select>
      </div>

      <Card
        title={day?.name}
        action={
          <Link href="/split" className="text-[13px] text-accent">
            Edit split
          </Link>
        }
      >
        {list.length ? (
          <ul className="divide-y divide-line">
            {list.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="block text-[12px] uppercase tracking-wide text-muted">{e.muscle}</span>
                  <span className="font-semibold">{e.name}</span>
                  <span className="ml-2 text-[13px] text-muted">{e.reps} reps</span>
                  {e.equipment && (
                    <span className="mt-0.5 flex flex-wrap gap-1">
                      {e.equipment.split(",").map((q) => (
                        <Badge key={q}>{q.trim()}</Badge>
                      ))}
                    </span>
                  )}
                </span>
                <span className="shrink-0 tabular-nums text-muted">{fmtWeight(e.weight_lb, units)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="No exercises on this day">
            <Link href="/split" className="text-accent">
              Add some in your split
            </Link>
          </Empty>
        )}
      </Card>

      {err && (
        <p role="alert" className="text-[14px] text-loss">
          {err}
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-[2fr_1fr]">
        <Button onClick={() => run(() => startWorkout(dayId))} disabled={pending || preview || !day} className="min-h-12 text-[16px]">
          {pending ? "Starting…" : `Start ${day?.name ?? ""}`}
        </Button>
        <Button variant="ghost" onClick={() => run(logRestDay)} disabled={pending || preview || restToday} className="min-h-12">
          {restToday ? "Rest day logged" : "Log rest day"}
        </Button>
      </div>
    </div>
  );
}
