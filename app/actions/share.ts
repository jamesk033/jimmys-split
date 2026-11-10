"use server";
import { z } from "zod";
import { getContext } from "@/lib/data";
import { FEEDBACK_WEBHOOK_KEY, LIFT_WEBHOOK_KEY, WEBHOOK_RE, getSiteSetting } from "@/lib/site-settings";

type Result = { ok: true } | { ok: false; error: string };

const KINDS = { workout: "Workout", week: "Weekly recap", month: "Month" } as const;

/** Posts a share image (the exact picture the Share button makes) to the lifting Discord channel. */
export async function postToDiscord(form: FormData): Promise<Result> {
  const kind = String(form.get("kind") ?? "") as keyof typeof KINDS;
  const title = String(form.get("title") ?? "").slice(0, 200);
  const sessionId = String(form.get("session") ?? "");
  const image = form.get("image");
  if (!(kind in KINDS)) return { ok: false, error: "Unknown post." };
  if (!(image instanceof Blob) || !image.type.startsWith("image/") || image.size > 8_000_000) return { ok: false, error: "Couldn't make the image." };
  const ctx = await getContext();
  if (ctx.guest) return { ok: false, error: "Make a free account to post." };
  const hook = await getSiteSetting(ctx, LIFT_WEBHOOK_KEY);
  if (!hook) return { ok: false, error: "Discord isn't set up yet. The site owner adds the channel in Settings." };
  const embed = {
    title: title || KINDS[kind],
    color: 0xa78bfa,
    image: { url: "attachment://lift.png" },
    footer: { text: "Jimmy's Split" },
    ...(ctx.username ? { author: { name: `@${ctx.username}` } } : {}),
  };
  const body = new FormData();
  body.append("files[0]", image, "lift.png");
  body.append("payload_json", JSON.stringify({ username: "Jimmy's Split", embeds: [embed], allowed_mentions: { parse: [] } }));
  try {
    const res = await fetch(hook, { method: "POST", body });
    if (!res.ok) return { ok: false, error: `Discord said no (${res.status}). Check the channel link in Settings.` };
  } catch {
    return { ok: false, error: "Couldn't reach Discord. Try again." };
  }
  if (kind === "workout" && z.string().uuid().safeParse(sessionId).success) await ctx.supabase.from("lift_sessions").update({ discord_posted_at: new Date().toISOString() }).eq("id", sessionId);
  return { ok: true };
}

/** Admin only (the database enforces it): the Discord channel everyone's lifting posts go to. Empty turns it off. */
export async function setLiftWebhook(raw: string): Promise<Result> {
  const v = raw.trim();
  if (v && !WEBHOOK_RE.test(v)) return { ok: false, error: "That isn't a Discord webhook link. It starts with https://discord.com/api/webhooks/" };
  const ctx = await getContext();
  if (!ctx.isAdmin) return { ok: false, error: "Only the site owner can change this." };
  const { error } = v
    ? await ctx.supabase.from("site_settings").upsert({ key: LIFT_WEBHOOK_KEY, value: v }, { onConflict: "key" })
    : await ctx.supabase.from("site_settings").delete().eq("key", LIFT_WEBHOOK_KEY);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Sends feedback to the site owner's Discord feedback channel (the same one Jimmy's Journal uses). */
export async function sendFeedback(message: string, page: string): Promise<Result> {
  const text = message.trim();
  if (text.length < 3) return { ok: false, error: "Write a little more first." };
  const ctx = await getContext();
  if (ctx.guest) return { ok: false, error: "Make a free account to send feedback." };
  const hook = await getSiteSetting(ctx, FEEDBACK_WEBHOOK_KEY);
  if (!hook) return { ok: false, error: "Feedback isn't set up yet. Message ICT_Jimmy on Discord instead." };
  const embed = {
    title: "Feedback",
    description: text.slice(0, 1800),
    color: 0xa78bfa,
    author: { name: ctx.username ? `@${ctx.username}` : "A user" },
    footer: { text: `Jimmy's Split${page ? ` · ${page.slice(0, 80)}` : ""}` },
    timestamp: new Date().toISOString(),
  };
  try {
    const res = await fetch(hook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "Jimmy's Split", embeds: [embed], allowed_mentions: { parse: [] } }) });
    if (!res.ok) return { ok: false, error: "Couldn't send it. Try again in a minute." };
  } catch {
    return { ok: false, error: "Couldn't send it. Try again in a minute." };
  }
  return { ok: true };
}
