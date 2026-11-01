"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { startWorkout } from "@/app/actions/lift";
import { DAYS, DAY_LABEL, type Day, type Exercise, type Units } from "@/lib/types";
import { fmtWeight } from "@/lib/units";
import { Badge, Button, Card, Empty, PageHeader, cx } from "./ui";

export function StartWorkout({ suggested, exercises, units, lastDate, preview = false }: { suggested: Day; exercises: Exercise[]; units: Units; lastDate: string | null; preview?: boolean }) {
  const router = useRouter();
  const [day, setDay] = useState<Day>(suggested);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const list = exercises.filter((e) => e.day === day).sort((a, b) => a.position - b.position);

  const go = () =>
    start(async () => {
      setErr("");
      const res = await startWorkout(day);
      if (!res.ok) return setErr(res.error);
      router.refresh();
    });

  return (
    <div className="grid gap-4">
      <PageHeader eyebrow="Upper / Lower x infinity" title={`Next up: ${DAY_LABEL[suggested]}`} sub={lastDate ? `Rest when needed. The split picks up where you left off.` : "Your first workout. Let's go."} />

      <div role="radiogroup" aria-label="Which day" className="grid grid-cols-2 gap-2">
        {DAYS.map((d) => (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={day === d}
            onClick={() => setDay(d)}
            className={cx("flex min-h-14 items-center justify-center gap-2 rounded-xl border text-[17px] font-semibold", day === d ? "border-accent bg-accent/15 text-ink" : "border-line bg-panel text-muted hover:text-ink")}
          >
            {DAY_LABEL[d]}
            {d === suggested && <Badge tone="accent">Next</Badge>}
          </button>
        ))}
      </div>

      <Card
        title={`${DAY_LABEL[day]} day`}
        action={
          <Link href="/split" className="text-[13px] text-accent">
            Edit split
          </Link>
        }
      >
        {list.length ? (
          <ul className="divide-y divide-line">
            {list.map((e) => (
              <li key={e.id} className="flex items-baseline justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="font-semibold">{e.name}</span>
                  <span className="ml-2 text-[13px] text-muted">
                    {e.sets} x {e.reps || "?"}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums text-muted">{fmtWeight(e.weight_lb, units)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty title={`No ${DAY_LABEL[day]} exercises yet`}>
            <Link href="/split" className="text-accent">
              Add them to your split
            </Link>
          </Empty>
        )}
      </Card>

      {err && (
        <p role="alert" className="text-[14px] text-loss">
          {err}
        </p>
      )}
      <Button onClick={go} disabled={pending || preview} className="min-h-12 w-full text-[16px]">
        {pending ? "Starting…" : `Start ${DAY_LABEL[day]}`}
      </Button>
    </div>
  );
}
