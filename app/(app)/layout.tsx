import { GuestGate } from "@/components/guest-gate";
import { Nav } from "@/components/nav";
import { SplitChoice, UnitsPicker, UsernameForm } from "@/components/settings-forms";
import { getContext } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getContext();
  const { data: live } = ctx.guest ? { data: { id: "guest" } } : await ctx.supabase.from("lift_sessions").select("id").eq("status", "active").maybeSingle();
  // After sign-up: pick a username (if missing), then lbs or kg, then Jimmy's split or your own.
  const gate = !ctx.username ? <UsernameForm first /> : !ctx.settings.units ? <UnitsPicker current={null} first /> : !ctx.settings.setup ? <SplitChoice /> : null;
  return (
    <div className="lg:pl-56">
      <Nav live={!!live} email={ctx.guest ? "Guest" : ctx.username ? `@${ctx.username}` : ctx.email} />
      <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 lg:pb-16">
        {ctx.guest && <GuestGate />}
        {gate ?? children}
      </main>
    </div>
  );
}
