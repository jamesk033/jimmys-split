import { Nav } from "@/components/nav";
import { UnitsPicker, UsernameForm } from "@/components/settings-forms";
import { getContext } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getContext();
  const { data: live } = await ctx.supabase.from("lift_sessions").select("id").eq("status", "active").maybeSingle();
  // After sign-up: pick a username (if missing), then lbs or kg.
  const gate = !ctx.username ? <UsernameForm first /> : !ctx.settings.units ? <UnitsPicker current={null} first /> : null;
  return (
    <div className="lg:pl-56">
      <Nav live={!!live} email={ctx.username ? `@${ctx.username}` : ctx.email} />
      <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 lg:pb-16">{gate ?? children}</main>
    </div>
  );
}
