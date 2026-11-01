"use client";
import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, signIn, signUp, updatePassword } from "@/app/actions/auth";
import { Button, Input, Label } from "./ui";

function Feedback({ state }: { state?: { error?: string; message?: string } }) {
  if (state?.error)
    return (
      <p className="text-[14px] text-loss" role="alert">
        {state.error}
      </p>
    );
  if (state?.message)
    return (
      <p className="rounded-lg bg-win/10 p-3 text-[14px] text-win" role="status">
        {state.message}
      </p>
    );
  return null;
}

const box = "grid gap-4 rounded-xl border border-line bg-panel p-5";

export function LoginForm({ next, linkError }: { next: string; linkError?: boolean }) {
  const [state, action, pending] = useActionState(signIn, linkError ? { error: "That link expired or was already used. Sign in, or request a new one." } : undefined);
  return (
    <>
      <form action={action} className={box}>
        <input type="hidden" name="next" value={next} />
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot" className="text-[13px] text-accent">
              Forgot password?
            </Link>
          </div>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <Feedback state={state} />
        <Button type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-4 text-center text-[14px] text-muted">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-accent">
          Create a free account
        </Link>
      </p>
    </>
  );
}

export function SignUpForm({ referral = "" }: { referral?: string }) {
  const [state, action, pending] = useActionState(signUp, undefined);
  return (
    <>
      <form action={action} className={box}>
        <input type="hidden" name="ref" value={referral} />
        {referral && <p className="rounded-lg bg-accent/10 px-3 py-2 text-[13px] text-accent">Invited with code {referral}</p>}
        <div>
          <Label htmlFor="username">Username</Label>
          <Input id="username" name="username" autoComplete="username" required minLength={3} maxLength={20} pattern="@?[A-Za-z0-9_]{3,20}" placeholder="e.g. ICT_Jimmy" title="3 to 20 letters, numbers or underscores" />
          <p className="mt-1 text-[12px] text-muted">Same account works on Jimmy&apos;s Journal. You sign in with your email.</p>
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <Label htmlFor="password">Password (8+ characters)</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </div>
        <div>
          <Label htmlFor="confirm">Confirm password</Label>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
        </div>
        <Feedback state={state} />
        <Button type="submit" disabled={pending || !!state?.message}>
          {pending ? "Creating account…" : "Create account"}
        </Button>
        <p className="text-[12px] text-muted">
          Your workouts are private. By creating an account you agree to the{" "}
          <Link href="/privacy" className="text-accent underline underline-offset-2">
            privacy and terms
          </Link>
          . Not medical advice.
        </p>
      </form>
      <p className="mt-4 text-center text-[14px] text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-accent">
          Sign in
        </Link>
      </p>
    </>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  return (
    <>
      <form action={action} className={box}>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <Feedback state={state} />
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      <p className="mt-4 text-center text-[14px] text-muted">
        <Link href="/login" className="text-accent">
          Back to sign in
        </Link>
      </p>
    </>
  );
}

export function ResetForm() {
  const [state, action, pending] = useActionState(updatePassword, undefined);
  return (
    <form action={action} className={box}>
      <div>
        <Label htmlFor="password">New password (8+ characters)</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <div>
        <Label htmlFor="confirm">Confirm new password</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <Feedback state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
