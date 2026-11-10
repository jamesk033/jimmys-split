import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Server-key client. Bypasses Row Level Security, so only use it on the server for site settings. */
export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
