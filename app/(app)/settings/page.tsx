import type { Metadata } from "next";
import { signOut } from "@/app/actions/auth";
import { MfaSettings } from "@/components/features/mfa";
import { DiscordForm, ResetForm, StartOverForm, TimezoneForm, UnitsPicker, UsernameForm } from "@/components/settings-forms";
import Link from "next/link";
import { Button, Card, PageHeader, buttonClass } from "@/components/ui";
import { getContext } from "@/lib/data";
import { LIFT_WEBHOOK_KEY, getSiteSetting } from "@/lib/site-settings";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ctx = await getContext();
  if (ctx.guest)
    return (
      <div className="grid gap-4">
        <PageHeader title="Settings" />
        <Card title="You're looking around as a guest">
          <p className="mb-4 text-[15px] text-muted">Make a free account to pick lbs or kg, use Jimmy&apos;s split or build your own, and log your workouts.</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/signup" className={buttonClass("primary")}>
              Create account
            </Link>
            <Link href="/login" className={buttonClass("ghost")}>
              Log in
            </Link>
          </div>
        </Card>
      </div>
    );
  return (
    <div className="grid gap-4">
      <PageHeader title="Settings" sub={ctx.email} />
      <UnitsPicker current={ctx.settings.units} />
      <UsernameForm current={ctx.username ?? ""} />
      <TimezoneForm current={ctx.settings.timezone} />
      <MfaSettings />
      {ctx.isAdmin && <DiscordForm current={await getSiteSetting(ctx, LIFT_WEBHOOK_KEY)} />}
      <StartOverForm current={ctx.settings.setup} />
      <ResetForm />
      <Card title="Account">
        <form action={signOut}>
          <Button variant="ghost">Sign out</Button>
        </form>
      </Card>
    </div>
  );
}
