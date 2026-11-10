"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cx } from "./ui";

const KEY = "jimmys-split.first-run.hidden";

/** Getting started list for new accounts. Disappears when everything is done, or when hidden. */
export function FirstRun({ steps }: { steps: { label: string; href: string; done: boolean }[] }) {
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try {
      setHidden(localStorage.getItem(KEY) === "1");
    } catch {
      setHidden(false);
    }
  }, []);
  const left = steps.filter((s) => !s.done).length;
  if (hidden || left === 0) return null;
  return (
    <section className="rounded-2xl border border-accent/40 bg-accent/5 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold">
          Get started <span className="font-normal text-muted">· {steps.length - left} of {steps.length} done</span>
        </h2>
        <button
          type="button"
          className="min-h-10 rounded-lg px-2 text-[13px] text-muted hover:text-ink"
          onClick={() => {
            setHidden(true);
            try {
              localStorage.setItem(KEY, "1");
            } catch {}
          }}
        >
          Hide
        </button>
      </div>
      <ol className="grid gap-1.5">
        {steps.map((s) => (
          <li key={s.label}>
            <Link href={s.href} className={cx("flex min-h-10 items-center gap-3 rounded-lg px-2 text-[15px] hover:bg-panel2", s.done && "text-muted line-through")}>
              <span className={cx("grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[13px]", s.done ? "border-win bg-win/15 text-win" : "border-line")}>{s.done ? "✓" : ""}</span>
              {s.label}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
