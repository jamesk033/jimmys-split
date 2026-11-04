import "server-only";
import { randomUUID } from "node:crypto";
import { cache } from "react";
import { redirect } from "next/navigation";
import { DEFAULT_CHECKLIST, DEFAULT_DAYS, DEFAULT_EXERCISES, DEFAULT_NOTES } from "./defaults";
import { createClient, type ServerSupabase } from "./supabase/server";
import { unloggedDays } from "./lift";
import { DEFAULT_TZ, addDays, todayIn } from "./time";
import { normalizeExercise, normalizeSession, normalizeSet, type ChecklistItem, type Exercise, type LiftSettings, type Note, type SessionWithSets, type WorkoutDay } from "./types";

export interface AppContext {
  supabase: ServerSupabase;
  userId: string;
  email: string;
  username: string | null;
  settings: LiftSettings;
}

type Template = {
  exercises: { id: string; muscle: string; name: string; equipment: string; sets: number; reps: string; note: string; alternative: string; position: number }[];
  days: { id: string; name: string; position: number }[];
  items: { day_id: string; exercise_id: string; position: number }[];
  checklist: { kind: string; body: string; position: number }[];
  notes: { title: string; body: string; position: number }[];
};

/** Copy the site owner's split, exercise list, checklists and key notes (never weights), or the built-in starter. */
export async function seedFromTemplate(supabase: ServerSupabase, userId: string) {
  const { data } = await supabase.rpc("lift_template");
  let t = (data ?? {}) as Partial<Template>;
  if (!t.days?.length || !t.exercises?.length) {
    t = {
      ...t,
      exercises: DEFAULT_EXERCISES.map((e, i) => ({ ...e, id: `x${i}`, position: i })),
      days: DEFAULT_DAYS.map((d, i) => ({ id: `d${i}`, name: d.name, position: i })),
      items: DEFAULT_DAYS.flatMap((d, i) => d.exercises.map((x, p) => ({ day_id: `d${i}`, exercise_id: `x${x}`, position: p }))),
    };
  }
  const exId = new Map(t.exercises!.map((e) => [e.id, randomUUID()]));
  const dayId = new Map(t.days!.map((d) => [d.id, randomUUID()]));
  await supabase.from("lift_exercises").insert(
    t.exercises!.map((e) => ({ id: exId.get(e.id), user_id: userId, muscle: e.muscle ?? "", name: e.name, equipment: e.equipment ?? "", sets: e.sets ?? 1, reps: e.reps ?? "", note: e.note ?? "", alternative: e.alternative ?? "", position: e.position })),
  );
  await supabase.from("lift_days").insert(t.days!.map((d) => ({ id: dayId.get(d.id), user_id: userId, name: d.name, position: d.position })));
  const items = (t.items ?? []).filter((i) => exId.has(i.exercise_id) && dayId.has(i.day_id));
  if (items.length) await supabase.from("lift_day_exercises").insert(items.map((i) => ({ user_id: userId, day_id: dayId.get(i.day_id), exercise_id: exId.get(i.exercise_id), position: i.position })));
  const checklist = t.checklist?.length ? t.checklist : DEFAULT_CHECKLIST.map((c, i) => ({ ...c, position: i }));
  const notes = t.notes?.length ? t.notes : DEFAULT_NOTES.map((n, i) => ({ ...n, position: i }));
  await supabase.from("lift_checklist_items").insert(checklist.map((c) => ({ user_id: userId, kind: c.kind, body: c.body, position: c.position })));
  await supabase.from("lift_notes").insert(notes.map((n) => ({ user_id: userId, title: n.title, body: n.body ?? "", position: n.position })));
}

/** Any day that hit midnight with nothing logged becomes a rest day. Runs on page load, so no timer is needed. */
async function backfillRestDays(supabase: ServerSupabase, userId: string, tz: string) {
  const today = todayIn(tz);
  const { data: first } = await supabase.from("lift_sessions").select("date").order("date").limit(1);
  if (!first?.length) return;
  const from = String(first[0].date) > addDays(today, -91) ? String(first[0].date) : addDays(today, -91);
  const { data } = await supabase.from("lift_sessions").select("date").gte("date", from).lt("date", today);
  const missing = unloggedDays([String(first[0].date), ...(data ?? []).map((r) => String(r.date))], today);
  if (!missing.length) return;
  // The unique index on rest days (when present) stops two tabs from doubling up.
  await supabase.from("lift_sessions").insert(missing.map((date) => ({ user_id: userId, date, day_name: "Rest", rest: true, status: "done", started_at: `${date}T12:00:00Z`, finished_at: `${date}T12:00:00Z` })));
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
    await supabase.from("lift_settings").insert({ user_id: user.id });
    ({ data: row } = await supabase.from("lift_settings").select("*").eq("user_id", user.id).maybeSingle());
  }
  if (row?.setup) await backfillRestDays(supabase, user.id, (row.timezone as string) || DEFAULT_TZ);
  return {
    supabase,
    userId: user.id,
    email: user.email ?? "",
    username: (shared?.username as string | null) ?? null,
    settings: { user_id: user.id, units: row?.units === "kg" ? "kg" : row?.units === "lb" ? "lb" : null, timezone: (row?.timezone as string) || DEFAULT_TZ, setup: row?.setup === "template" || row?.setup === "own" ? row.setup : null },
  };
});

export async function getExercises(ctx: AppContext): Promise<Exercise[]> {
  const { data } = await ctx.supabase.from("lift_exercises").select("*").order("position").order("created_at");
  return (data ?? []).map(normalizeExercise);
}

/** Workout days in rotation order, each with its exercise ids in order. */
export async function getDays(ctx: AppContext): Promise<WorkoutDay[]> {
  const [{ data: days }, { data: items }] = await Promise.all([
    ctx.supabase.from("lift_days").select("id,name,position").order("position").order("created_at"),
    ctx.supabase.from("lift_day_exercises").select("day_id,exercise_id,position").order("position").order("created_at"),
  ]);
  return (days ?? []).map((d) => ({
    id: String(d.id),
    name: String(d.name),
    position: Number(d.position),
    exerciseIds: (items ?? []).filter((i) => i.day_id === d.id).map((i) => String(i.exercise_id)),
  }));
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
