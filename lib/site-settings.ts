import "server-only";
import { cache } from "react";
import type { AppContext } from "./data";
import { adminClient } from "./supabase/admin";

/**
 * Site-wide settings shared with Jimmy's Journal (table site_settings, admin only).
 * The admin reads them directly; for everyone else the server reads them with the server key.
 */
export const getSiteSetting = cache(async (ctx: AppContext, key: string): Promise<string> => {
  if (ctx.guest) return "";
  const own = await ctx.supabase.from("site_settings").select("value").eq("key", key).maybeSingle();
  if (own.data?.value) return own.data.value as string;
  const admin = adminClient();
  if (!admin) return "";
  const { data } = await admin.from("site_settings").select("value").eq("key", key).maybeSingle();
  return (data?.value as string) ?? "";
});

/** Discord channel lifting posts go to. */
export const LIFT_WEBHOOK_KEY = "lift_discord_webhook";
/** Feedback channel, shared with Jimmy's Journal. */
export const FEEDBACK_WEBHOOK_KEY = "discord_feedback";

export const WEBHOOK_RE = /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+$/;
