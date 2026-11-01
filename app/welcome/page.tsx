import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "Jimmy's Split: the lifting log by ICT_Jimmy" };

const FEATURES: [string, string][] = [
  ["Upper / Lower x infinity", "The next workout is always the opposite of the last one. Rest when you need it and the split picks up where you left off."],
  ["Check off every set", "Your weights load in from last time. Tap a set when it's done, change the weight or reps if you need to."],
  ["Set next workout's weight", "Bump each lift with + and − right after you finish it. Next time it's already loaded."],
  ["Pre-lift, post-lift, refuel", "Your own checklists for before, after and the meal that follows. Plus key notes for equipment and how you run your sets."],
  ["PRs and progress", "Estimated max for every lift, new PRs called out when you finish, a chart for each lift and a calendar of every session."],
  ["lbs or kg", "Pick one when you sign up. Switch any time in Settings."],
];

export default function WelcomePage() {
  return (
    <main className="safe-top mx-auto grid w-full max-w-3xl gap-10 px-4 pb-16 pt-10">
      <header className="flex items-center justify-between">
        <span className="text-xl font-bold tracking-tight">
          Jimmy&apos;s <span className="text-accent">Split</span>
        </span>
        <Link href="/login" className="text-[15px] font-semibold text-accent">
          Sign in
        </Link>
      </header>
      <section className="grid gap-4">
        <h1 className="text-[40px] font-bold leading-[1.05] tracking-tight text-balance sm:text-[52px]">
          Upper. Lower. <span className="text-accent glow-accent">Repeat.</span>
        </h1>
        <p className="max-w-xl text-[17px] text-muted">The lifting log by ICT_Jimmy. Run your split, check off every set, and walk in knowing exactly what to lift next time. Free.</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/signup" className={buttonClass("primary", "min-h-12 px-6 text-[16px]")}>
            Create a free account
          </Link>
          <Link href="/login" className={buttonClass("ghost", "min-h-12 px-6 text-[16px]")}>
            Sign in
          </Link>
        </div>
        <p className="text-[13px] text-muted">Have a Jimmy&apos;s Journal account? Same email and password works here.</p>
      </section>
      <section className="grid gap-3 sm:grid-cols-2">
        {FEATURES.map(([t, d]) => (
          <div key={t} className="rounded-2xl border border-line bg-panel p-5">
            <h2 className="text-[17px] font-semibold">{t}</h2>
            <p className="mt-1 text-[15px] text-muted">{d}</p>
          </div>
        ))}
      </section>
      <footer className="text-[13px] text-muted">
        <Link href="/privacy" className="hover:text-ink">
          Privacy and terms
        </Link>
      </footer>
    </main>
  );
}
