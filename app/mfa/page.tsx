import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { MfaChallenge } from "@/components/features/mfa";

export const metadata: Metadata = { title: "Two-factor code" };

export default async function MfaPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return (
    <AuthShell title="Enter your authenticator code">
      <MfaChallenge next={safe} />
    </AuthShell>
  );
}
