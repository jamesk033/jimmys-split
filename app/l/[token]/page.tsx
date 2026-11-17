import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { buttonClass, cx } from "@/components/ui";
import { e1rm } from "@/lib/lift";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { longDate } from "@/lib/time";
import { titleCase } from "@/lib/title-case";
import type { Units } from "@/lib/types";
import { fmtBig, fmtWeight } from "@/lib/units";

export const dynamic = "force-dynamic";

interface SharedSet {
  name: string;
  target_reps: string;
  position: number;
  set_no: number;
  weight_lb: number | null;
  reps: number | null;
}
interface Shared {
  date: string;
  day_name: string;
  notes: string;
  username: string;
  units: Units;
  image_path: string | null;
  sets: SharedSet[];
  /** Best estimated max per lift (lower-case name) from earlier workouts. */
  prior: Record<string, number>;
}

const load = cache(async (token: string): Promise<Shared | null> => {
  if (!/^[A-Za-z0-9]{16,64}$/.test(token)) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("shared_workout", { p_token: token });
  return (data as Shared | null) ?? null;
});

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const w = await load((await params).token);
  if (!w) return { title: "Workout not found", robots: { index: false } };
  const title = `${titleCase(w.day_name || "Workout")} · ${longDate(w.date)}${w.username ? ` · @${w.username}` : ""}`;
  return { title: { absolute: `${title} | Jimmy's Split` }, description: "A workout from Jimmy's Split, the lifting log by ICT_Jimmy.", robots: { index: false } };
}

/** Public, read-only page for one shared workout. */
export default async function SharedWorkoutPage({ params }: { params: Promise<{ token: string }> }) {
  const w = await load((await params).token);
  if (!w) notFound();
  const units: Units = w.units === "kg" ? "kg" : "lb";
  let photo: string | null = null;
  if (w.image_path) {
    const admin = adminClient();
    if (admin) photo = (await admin.storage.from("journal-images").createSignedUrl(w.image_path, 3600)).data?.signedUrl ?? null;
  }
  // One group per exercise, in workout order.
  const groups: { name: string; target: string; sets: SharedSet[] }[] = [];
  for (const s of w.sets) {
    const g = groups.find((x) => x.name === s.name && x.sets[0].position === s.position);
    if (g) g.sets.push(s);
    else groups.push({ name: s.name, target: s.target_reps, sets: [s] });
  }
  const done = (s: SharedSet) => (s.reps ?? 0) > 0;
  const isPr = (g: (typeof groups)[number]) => {
    const prev = w.prior[g.name.trim().toLowerCase()];
    if (prev === undefined) return false;
    const best = Math.max(0, ...g.sets.map((s) => (done(s) ? (e1rm(s.weight_lb, s.reps) ?? 0) : 0)));
    return best > prev + 0.01;
  };
  const prCount = groups.filter(isPr).length;
  const vol = w.sets.filter((s) => done(s) && s.weight_lb !== null).reduce((t, s) => t + (s.weight_lb ?? 0) * (s.reps ?? 0), 0);
  const setsDone = w.sets.filter(done).length;

  return (
    <main className="safe-top mx-auto w-full max-w-3xl px-4 pb-16 pt-6">
      <header className="mb-6 flex items-center justify-between gap-3">
        <Link href="/welcome" className="text-xl font-bold tracking-tight">
          Jimmy&apos;s <span className="text-accent">Split</span>
        </Link>
        {w.username && <span className="text-[14px] font-semibold text-muted">@{w.username}</span>}
      </header>

      <article className="overflow-hidden rounded-2xl border border-line bg-panel">
        <div className="flex flex-wrap items-end justify-between gap-4 p-5">
          <div>
            <p className="text-[14px] text-muted">{longDate(w.date)}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{titleCase(w.day_name || "Workout")}</h1>
          </div>
          <div className="flex gap-6 text-right">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-muted">Sets</p>
              <p className="num text-2xl font-extrabold">{setsDone}</p>
            </div>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-muted">Volume</p>
              <p className="num text-2xl font-extrabold">{fmtBig(vol, units)}</p>
            </div>
            {prCount > 0 && (
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-wider text-muted">PRs</p>
                <p className="num text-2xl font-extrabold text-win">{prCount}</p>
              </div>
            )}
          </div>
        </div>

        {photo && (
          <a href={photo} target="_blank" rel="noopener noreferrer" className="block border-y border-line bg-bg">
            <img src={photo} alt="Workout photo" className="max-h-[70vh] w-full object-contain" />
          </a>
        )}

        <div className="grid gap-3 p-5">
          {groups.map((g, i) => {
            const pr = isPr(g);
            return (
              <section key={`${g.name}-${i}`} className={cx("rounded-xl border p-3", pr ? "border-win/50" : "border-line")}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <h2 className="text-[16px] font-semibold">{titleCase(g.name)}</h2>
                  <span className="shrink-0 text-[12px] text-muted">
                    {pr && <span className="mr-2 font-semibold text-win">PR</span>}
                    {g.target && `${g.target} reps`}
                  </span>
                </div>
                <ul className="flex flex-wrap gap-2 text-[14px]">
                  {g.sets.map((s) => (
                    <li key={s.set_no} className={cx("num rounded-lg px-2.5 py-1", done(s) ? "bg-panel2" : "bg-panel2/50 text-muted")}>
                      {done(s) ? `${s.weight_lb !== null ? fmtWeight(s.weight_lb, units) : "BW"} x ${s.reps}` : "skipped"}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          {w.notes && (
            <section className="rounded-xl border border-accent/30 bg-accent/10 p-4">
              <h2 className="mb-1 text-[13px] font-semibold uppercase tracking-wider text-accent">Notes</h2>
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{w.notes}</p>
            </section>
          )}
        </div>
      </article>

      <section className="mt-8 text-center">
        <p className="text-[15px] text-muted">Log your own lifts like this, free.</p>
        <Link href="/welcome" className={buttonClass("primary", "mt-3 min-h-12 px-6 text-[16px]")}>
          Start your log
        </Link>
      </section>
    </main>
  );
}
