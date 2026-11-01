import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { ResetForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "New password" };

export default function ResetPage() {
  return (
    <AuthShell title="Choose a new password">
      <ResetForm />
    </AuthShell>
  );
}
