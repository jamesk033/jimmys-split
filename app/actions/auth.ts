"use server";
import { cookies, headers } from "next/headers";
import { GUEST_COOKIE } from "@/lib/guest";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type State = { error?: string; message?: string } | undefined;

/** The site's own address, so email links come back here (works on Vercel and locally). */
async function siteOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

const safeNext = (n: string) => (n.startsWith("/") && !n.startsWith("//") ? n : "/");

export async function signIn(_prev: State, formData: FormData): Promise<State> {
  (await cookies()).delete(GUEST_COOKIE);
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");
  if (!email || !password) return { error: "Enter your email and password." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) return { error: "Confirm your email first. Check your inbox for the link." };
    return { error: error.message === "Invalid login credentials" ? "That email and password don't match." : error.message };
  }
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") redirect(`/mfa?next=${encodeURIComponent(safeNext(next))}`);
  redirect(safeNext(next));
}

export async function signUp(_prev: State, formData: FormData): Promise<State> {
  (await cookies()).delete(GUEST_COOKIE);
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const ref = String(formData.get("ref") ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);
  const username = String(formData.get("username") ?? "").trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) return { error: "Usernames are 3 to 20 letters, numbers or underscores." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email." };
  if (password.length < 8) return { error: "Use at least 8 characters for your password." };
  if (password !== confirm) return { error: "The two passwords don't match." };
  const supabase = await createClient();
  const { data: free, error: checkError } = await supabase.rpc("username_available", { p_name: username });
  if (!checkError && free === false) return { error: "That username is taken." };
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/callback?next=/`, data: ref ? { ref, username } : { username } },
  });
  if (error) {
    if (error.message.toLowerCase().includes("signups not allowed")) return { error: "New sign-ups are closed right now." };
    if (error.message.toLowerCase().includes("already registered")) return { error: "That email already has an account. Sign in instead." };
    return { error: error.message };
  }
  if (data.session) redirect("/");
  return { message: `Check ${email} for a confirmation link, then come back and sign in.` };
}

export async function requestPasswordReset(_prev: State, formData: FormData): Promise<State> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${await siteOrigin()}/auth/callback?next=/reset` });
  // Same answer whether or not the email exists, so accounts can't be discovered.
  return { message: "If that email has an account, a reset link is on its way." };
}

export async function updatePassword(_prev: State, formData: FormData): Promise<State> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "Use at least 8 characters." };
  if (password !== confirm) return { error: "The two passwords don't match." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  redirect("/");
}

export async function signOut() {
  (await cookies()).delete(GUEST_COOKIE);
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
