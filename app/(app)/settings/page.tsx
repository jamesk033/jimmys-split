import type { Metadata } from "next";
import { signOut } from "@/app/actions/auth";
import { MfaSettings } from "@/components/features/mfa";
import { ResetForm, StartOverForm, TimezoneForm, UnitsPicker, UsernameForm } from "@/components/settings-forms";
import { Button, Card, PageHeader } from "@/components/ui";
import { getContext } from "@/lib/data";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ctx = await getContext();
  return (
    <div className="grid gap-4">
      <PageHeader title="Settings" sub={ctx.email} />
      <UnitsPicker current={ctx.settings.units} />
      <UsernameForm current={ctx.username ?? ""} />
      <TimezoneForm current={ctx.settings.timezone} />
      <MfaSettings />
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
