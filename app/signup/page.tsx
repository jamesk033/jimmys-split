import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { SignUpForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Create account" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  const code = (ref ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);
  return (
    <AuthShell title="Create your free account">
      <SignUpForm referral={code} />
    </AuthShell>
  );
}
