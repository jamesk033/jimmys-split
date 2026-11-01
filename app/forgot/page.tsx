import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { ForgotForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPage() {
  return (
    <AuthShell title="Reset your password">
      <ForgotForm />
    </AuthShell>
  );
}
