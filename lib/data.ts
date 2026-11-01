import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { DEFAULT_CHECKLIST, DEFAULT_EXERCISES, DEFAULT_NOTES } from "./defaults";
import { createClient, type ServerSupabase } from "./supabase/server";
import { DEFAULT_TZ } from "./time";
import { normalizeExercise, normalizeSession, normalizeSet, type ChecklistItem, type Exercise, type LiftSettings, type Note, type SessionWithSets } from "./types";

export interface AppContext {
  supabase: ServerSupabase;
  userId: string;
  email: string;
  username: string | null;
  settings: LiftSettings;
}

type Template = {
  exercises: { day: string; name: string; sets: number; reps: string; note: string; position: number }[];
  checklist: { kind: string; body: string; position: number }[];
  notes: { title: string; body: string; position: number }[];
};

/** First visit: copy the site owner's split, checklists and key notes (or the built-in starter). */
async function seed(supabase: ServerSupabase, userId: string) {
  const { data } = await supabase.rpc("lift_template");
  const t = (data ?? { exercises: [], checklist: [], notes: [] }) as Template;
  const exercises = t.exercises?.length ? t.exercises : DEFAULT_EXERCISES.map((e, i) => ({ ...e, position: i }));
  const checklist = t.checklist?.length ? t.checklist : DEFAULT_CHECKLIST.map((c, i) => ({ ...c, position: i }));
  const notes = t.notes?.length ? t.notes : DEFAULT_NOTES.map((n, i) => ({ ...n, position: i }));
  await supabase.from("lift_exercises").insert(exercises.map((e) => ({ user_id: userId, day: e.day, name: e.name, sets: e.sets, reps: e.reps, note: e.note ?? "", position: e.position })));
  await supabase.from("lift_checklist_items").insert(checklist.map((c) => ({ user_id: userId, kind: c.kind, body: c.body, position: c.position })));
  await supabase.from("lift_notes").insert(notes.map((n) => ({ user_id: userId, title: n.title, body: n.body ?? "", position: n.position })));
}

/** Signed-in user, username and lifting settings. Cached per request. */
export const getContext = cache(async (): Promise<AppContext> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Username is shared with Jimmy's Split.
  let { data: shared } = await supabase.from("user_settings").select("username").eq("user_id", user.id).maybeSingle();
  if (!shared) {
    const picked = typeof user.user_metadata?.username === "string" ? user.user_metadata.username : null;
    const first = await supabase.from("user_settings").upsert({ user_id: user.id, ...(picked ? { username: picked } : {}) }, { onConflict: "user_id", ignoreDuplicates: true });
    if (first.error && picked) await supabase.from("user_settings").upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });
    ({ data: shared } = await supabase.from("user_settings").select("username").eq("user_id", user.id).maybeSingle());
  }

  let { data: row } = await supabase.from("lift_settings").select("*").eq("user_id", user.id).maybeSingle();
  if (!row) {
    const { error } = await supabase.from("lift_settings").insert({ user_id: user.id });
    if (!error) await seed(supabase, user.id);
    ({ data: row } = await supabase.from("lift_settings").select("*").eq("user_id", user.id).maybeSingle());
  }
  return {
    supabase,
    userId: user.id,
    email: user.email ?? "",
    username: (shared?.username as string | null) ?? null,
    settings: { user_id: user.id, units: row?.units === "kg" ? "kg" : row?.units === "lb" ? "lb" : null, timezone: (row?.timezone as string) || DEFAULT_TZ },
  };
});

export async function getExercises(ctx: AppContext): Promise<Exercise[]> {
  const { data } = await ctx.supabase.from("lift_exercises").select("*").order("day").order("position").order("created_at");
  return (data ?? []).map(normalizeExercise);
}

export async function getChecklist(ctx: AppContext): Promise<ChecklistItem[]> {
  const { data } = await ctx.supabase.from("lift_checklist_items").select("id,kind,body,position").order("kind").order("position").order("created_at");
  return (data ?? []) as ChecklistItem[];
}

export async function getNotes(ctx: AppContext): Promise<Note[]> {
  const { data } = await ctx.supabase.from("lift_notes").select("id,title,body,position").order("position").order("created_at");
  return (data ?? []) as Note[];
}

/** Workouts with their sets, newest first. */
export async function getSessions(ctx: AppContext, opts: { from?: string; to?: string; id?: string } = {}): Promise<SessionWithSets[]> {
  let q = ctx.supabase.from("lift_sessions").select("*").order("date", { ascending: false }).order("started_at", { ascending: false });
  if (opts.from) q = q.gte("date", opts.from);
  if (opts.to) q = q.lte("date", opts.to);
  if (opts.id) q = q.eq("id", opts.id);
  const { data } = await q;
  const sessions = (data ?? []).map(normalizeSession);
  if (!sessions.length) return [];
  const sets: ReturnType<typeof normalizeSet>[] = [];
  // Page through sets so long histories load in full.
  for (let from = 0; ; from += 1000) {
    let sq = ctx.supabase.from("lift_sets").select("*").order("position").order("set_no").range(from, from + 999);
    if (opts.id) sq = sq.eq("session_id", opts.id);
    else if (opts.from || opts.to) sq = sq.in("session_id", sessions.map((s) => s.id));
    const { data: page } = await sq;
    sets.push(...(page ?? []).map(normalizeSet));
    if (!page || page.length < 1000) break;
  }
  const by = new Map<string, typeof sets>();
  for (const s of sets) by.set(s.session_id, [...(by.get(s.session_id) ?? []), s]);
  return sessions.map((s) => ({ ...s, sets: by.get(s.id) ?? [] }));
}
