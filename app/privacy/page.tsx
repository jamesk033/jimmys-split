import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy and terms" };

const H = ({ children }: { children: React.ReactNode }) => <h2 className="mt-8 text-[17px] font-semibold">{children}</h2>;

export default function PrivacyPage() {
  return (
    <main className="safe-top mx-auto w-full max-w-2xl px-4 pb-16 pt-8 text-[15px] leading-relaxed">
      <Link href="/" className="text-xl font-bold tracking-tight">
        Jimmy&apos;s <span className="text-accent">Split</span>
      </Link>
      <h1 className="mt-6 text-2xl font-bold">Privacy and terms</h1>
      <p className="mt-1 text-muted">Last updated November 1, 2026</p>

      <H>Not medical advice</H>
      <p className="mt-2">
        Jimmy&apos;s Split is a workout log. Nothing on this site, including the split, the notes, the estimated maxes or the checklists, is medical, fitness or nutrition advice.
        Lifting carries a risk of injury. Check with a doctor before starting a new program, use good form and spotters, and you are responsible for your own training.
      </p>

      <H>What we store</H>
      <ul className="mt-2 list-disc pl-5">
        <li>Your email and an encrypted password, to sign you in. This account is shared with Jimmy&apos;s Journal.</li>
        <li>What you put in: your split, weights, workouts, sets, checklists, key notes, bodyweight and notes.</li>
        <li>Your settings: username, units and timezone.</li>
      </ul>

      <H>Who can see it</H>
      <p className="mt-2">Only you. Every row is locked to your account in the database. We don&apos;t sell or share your data.</p>

      <H>Deleting your data</H>
      <p className="mt-2">You can delete every workout from Settings. To delete your whole account, email jameskester033@gmail.com.</p>

      <H>Analytics</H>
      <p className="mt-2">Vercel Analytics counts page views and load speed without cookies.</p>
    </main>
  );
}
