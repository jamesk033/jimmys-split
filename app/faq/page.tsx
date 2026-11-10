import type { Metadata } from "next";
import Link from "next/link";
import { FeedbackForm } from "@/components/feedback-form";
import { Card, buttonClass } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Help and FAQ", description: "How Jimmy's Split works: the rotation, rest days, logging sets, weights, PRs and sharing." };

const FAQ: { q: string; a: React.ReactNode }[] = [
  { q: "How does the rotation work?", a: "Your split is a list of days that runs top to bottom, then starts over. The next workout is always the day after the last one you finished. You can pick a different day before you start." },
  { q: "What happens on a rest day?", a: "Rest days never move the rotation, so your next workout stays the same. Tap Log rest day, or just don't log anything: once midnight passes, a day with nothing logged is saved as a rest day." },
  { q: "How do I log a set?", a: "Type the reps. A set with reps counts as done and its number turns green. Change the weight on a set if you used something different today; the new weight carries down to the sets after it." },
  { q: "How do I set my weight for next time?", a: "Every exercise in a workout has a Next time box with − and +. Whatever it says is what loads next time, on every day that uses that exercise. When you beat the top of your rep range (9 on 4-8, 7 on 4-6, 11 on 6-10), the workout tells you to go up." },
  { q: "How do I change my split?", a: "Open Split. Tap a day to rename it, reorder or remove its exercises, or add one (type a new name or pick one you already have). Tap an exercise to edit its weight, rep range, equipment, notes and alternative. An exercise that's on no day is removed." },
  { q: "Can I paste in my whole program?", a: "Yes. On Split, open Paste in a split. Put the day name on its own line, then one exercise per line as Muscle - Exercise - Equipment, with a blank line between days. Add | weight | reps at the end of a line if you want." },
  { q: "Can I change things mid-workout?", a: "Yes. Tap Edit on any exercise to change its details (they save to your exercise list), swap to its alternative for today, or remove it from this workout. You can also add or remove sets, or add a one-off exercise at the bottom." },
  { q: "How are PRs worked out?", a: "Each set's estimated one-rep max (Epley formula, sets of 1 to 12 reps). A PR is a workout that beats every earlier one for that exercise. The first time you do an exercise isn't a PR." },
  { q: "Can I switch between lbs and kg?", a: "Yes, any time in Settings. Nothing is lost; every weight just shows in the other unit." },
  { q: "How do I share a workout?", a: "Open a finished workout from History and use Share workout image or Download. The Calendar has a month picture and Home has the weekly recap. Post to Discord shows up once the site owner has set up the channel." },
  { q: "Can I use Jimmy's split or my own?", a: "Both. After signing up you pick one. To switch later, go to Settings, Start over. Your workout history stays." },
  { q: "Does my Jimmy's Journal account work here?", a: "Yes. It's the same account: sign in with the same email and password." },
  { q: "Can other people see my workouts?", a: "No. Your workouts, weights and notes are private to your account unless you share a picture yourself." },
];

/** Help page, open to everyone. Signed-in users can send feedback from here. */
export default async function FaqPage() {
  let signedIn = false;
  try {
    const supabase = await createClient();
    signedIn = !!(await supabase.auth.getUser()).data.user;
  } catch {
    signedIn = false;
  }
  return (
    <main className="safe-top mx-auto w-full max-w-3xl px-4 pb-16 pt-6">
      <header className="mb-8 flex items-center justify-between gap-3">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Jimmy&apos;s <span className="text-accent">Split</span>
        </Link>
        <Link href="/" className="min-h-11 rounded-lg px-3 py-2.5 text-[15px] font-semibold text-muted hover:text-ink">
          {signedIn ? "Back to the site" : "Home"}
        </Link>
      </header>
      <h1 className="text-3xl font-bold tracking-tight">Help and FAQ</h1>
      <div className="mt-6 grid gap-2">
        {FAQ.map((f) => (
          <details key={f.q} className="group rounded-xl border border-line bg-panel open:bg-panel2/40">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-[16px] font-semibold focus-visible:outline-2 focus-visible:outline-accent">
              {f.q}
              <span aria-hidden className="text-muted transition group-open:rotate-45">
                +
              </span>
            </summary>
            <div className="px-4 pb-4 text-[15px] leading-relaxed text-muted">{f.a}</div>
          </details>
        ))}
      </div>
      <Card title="Send feedback" className="mt-8">
        {signedIn ? (
          <FeedbackForm />
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[15px] text-muted">Sign in to send feedback.</p>
            <Link href="/login?next=/faq" className={buttonClass("ghost")}>
              Sign in
            </Link>
          </div>
        )}
      </Card>
    </main>
  );
}
