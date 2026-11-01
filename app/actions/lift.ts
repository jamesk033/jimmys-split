"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContext, getExercises } from "@/lib/data";
import { setsFromSplit } from "@/lib/lift";
import { todayIn } from "@/lib/time";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

const uuid = z.string().uuid();
const day = z.enum(["upper", "lower"]);
const lb = z.number().finite().min(0).max(5000).nullable();
const fail = (e: { message: string } | null | undefined, fallback = "Couldn't save. Try again."): ActionResult => (e ? { ok: false, error: e.message || fallback } : { ok: true });

// ---------- settings ----------

export async function setUnits(units: "lb" | "kg"): Promise<ActionResult> {
  if (units !== "lb" && units !== "kg") return { ok: false, error: "Pick lbs or kg." };
  const ctx = await getContext();
  const { error } = await ctx.supabase.from("lift_settings").update({ units }).eq("user_id", ctx.userId);
  revalidatePath("/", "layout");
  return fail(error);
}

export async function setTimezone(tz: string): Promise<ActionResult> {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
  } catch {
    return { ok: false, error: "Unknown timezone." };
  }
  const ctx = await getContext();
  const { error } = await ctx.supabase.from("lift_settings").update({ timezone: tz }).eq("user_id", ctx.userId);
  revalidatePath("/", "layout");
  return fail(error);
}

export async function setUsername(raw: string): Promise<ActionResult> {
  const name = raw.trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9_]{3,20}$/.test(name)) return { ok: false, error: "3 to 20 letters, numbers or underscores." };
  const ctx = await getContext();
  const { data: free } = await ctx.supabase.rpc("username_available", { p_name: name });
  if (free === false) return { ok: false, error: "That username is taken." };
  const { error } = await ctx.supabase.from("user_settings").update({ username: name }).eq("user_id", ctx.userId);
  if (error?.code === "23505") return { ok: false, error: "That username is taken." };
  revalidatePath("/", "layout");
  return fail(error);
}

/** Deletes every workout. The split, checklists and key notes stay. */
export async function resetWorkouts(confirm: string): Promise<ActionResult> {
  if (confirm.trim().toUpperCase() !== "DELETE") return { ok: false, error: 'Type DELETE to confirm.' };
  const ctx = await getContext();
  const { error } = await ctx.supabase.from("lift_sessions").delete().eq("user_id", ctx.userId);
  revalidatePath("/", "layout");
  return fail(error);
}

// ---------- the split ----------

const exerciseSchema = z.object({
  id: uuid.optional(),
  day,
  name: z.string().trim().min(1, "Name the exercise.").max(80),
  sets: z.number().int().min(1).max(20),
  reps: z.string().trim().max(20),
  weight_lb: lb,
  note: z.string().max(300),
});

export async function saveExercise(raw: unknown): Promise<ActionResult> {
  const p = exerciseSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Check the exercise." };
  const ctx = await getContext();
  const { id, ...row } = p.data;
  if (id) {
    const { error } = await ctx.supabase.from("lift_exercises").update(row).eq("id", id);
    return error ? fail(error) : { ok: true, id };
  }
  const { data: last } = await ctx.supabase.from("lift_exercises").select("position").eq("day", row.day).order("position", { ascending: false }).limit(1);
  const { data, error } = await ctx.supabase.from("lift_exercises").insert({ ...row, user_id: ctx.userId, position: (last?.[0]?.position ?? -1) + 1 }).select("id").single();
  if (error) return fail(error);
  revalidatePath("/split");
  return { ok: true, id: data.id };
}

export async function deleteExercise(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Unknown exercise." };
  const ctx = await getContext();
  const { error } = await ctx.supabase.from("lift_exercises").delete().eq("id", id);
  revalidatePath("/split");
  return fail(error);
}

/** Saves a new order for one table (exercises within a day, checklist items, notes). */
export async function reorder(table: "lift_exercises" | "lift_checklist_items" | "lift_notes", ids: string[]): Promise<ActionResult> {
  if (!["lift_exercises", "lift_checklist_items", "lift_notes"].includes(table)) return { ok: false, error: "Unknown list." };
  if (!z.array(uuid).max(200).safeParse(ids).success) return { ok: false, error: "Unknown items." };
  const ctx = await getContext();
  for (let i = 0; i < ids.length; i++) {
    const { error } = await ctx.supabase.from(table).update({ position: i }).eq("id", ids[i]);
    if (error) return fail(error);
  }
  return { ok: true };
}

// ---------- checklists and key notes ----------

export async function saveChecklistItem(raw: unknown): Promise<ActionResult> {
  const p = z.object({ id: uuid.optional(), kind: z.enum(["pre", "post", "refuel"]), body: z.string().trim().min(1, "Write the item.").max(200) }).safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Check the item." };
  const ctx = await getContext();
  const { id, ...row } = p.data;
  if (id) return fail((await ctx.supabase.from("lift_checklist_items").update({ body: row.body }).eq("id", id)).error);
  const { data: last } = await ctx.supabase.from("lift_checklist_items").select("position").eq("kind", row.kind).order("position", { ascending: false }).limit(1);
  const { data, error } = await ctx.supabase.from("lift_checklist_items").insert({ ...row, user_id: ctx.userId, position: (last?.[0]?.position ?? -1) + 1 }).select("id").single();
  return error ? fail(error) : { ok: true, id: data.id };
}

export async function deleteChecklistItem(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Unknown item." };
  const ctx = await getContext();
  return fail((await ctx.supabase.from("lift_checklist_items").delete().eq("id", id)).error);
}

export async function saveNote(raw: unknown): Promise<ActionResult> {
  const p = z.object({ id: uuid.optional(), title: z.string().trim().min(1, "Give the section a title.").max(80), body: z.string().max(5000) }).safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Check the note." };
  const ctx = await getContext();
  const { id, ...row } = p.data;
  if (id) return fail((await ctx.supabase.from("lift_notes").update(row).eq("id", id)).error);
  const { data: last } = await ctx.supabase.from("lift_notes").select("position").order("position", { ascending: false }).limit(1);
  const { data, error } = await ctx.supabase.from("lift_notes").insert({ ...row, user_id: ctx.userId, position: (last?.[0]?.position ?? -1) + 1 }).select("id").single();
  return error ? fail(error) : { ok: true, id: data.id };
}

export async function deleteNote(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Unknown section." };
  const ctx = await getContext();
  return fail((await ctx.supabase.from("lift_notes").delete().eq("id", id)).error);
}

// ---------- workouts ----------

/** Starts Upper or Lower from the split at the current weights, or reopens the one already going. */
export async function startWorkout(d: "upper" | "lower"): Promise<ActionResult> {
  if (!day.safeParse(d).success) return { ok: false, error: "Pick Upper or Lower." };
  const ctx = await getContext();
  const { data: open } = await ctx.supabase.from("lift_sessions").select("id").eq("status", "active").maybeSingle();
  if (open) return { ok: true, id: open.id };
  const id = randomUUID();
  const { error } = await ctx.supabase.from("lift_sessions").insert({ id, user_id: ctx.userId, date: todayIn(ctx.settings.timezone), day: d, status: "active" });
  if (error) return fail(error);
  const sets = setsFromSplit(await getExercises(ctx), d, id, randomUUID);
  if (sets.length) {
    const { error: e2 } = await ctx.supabase.from("lift_sets").insert(sets.map((s) => ({ ...s, user_id: ctx.userId })));
    if (e2) return fail(e2);
  }
  revalidatePath("/", "layout");
  return { ok: true, id };
}

const setSchema = z.object({
  id: uuid,
  exercise_id: uuid.nullable(),
  name: z.string().trim().min(1).max(80),
  target_reps: z.string().max(20),
  position: z.number().int().min(0).max(500),
  set_no: z.number().int().min(1).max(50),
  weight_lb: lb,
  reps: z.number().int().min(0).max(200).nullable(),
  done: z.boolean(),
});

const workoutSchema = z.object({
  id: uuid,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pre_done: z.array(z.string().max(200)).max(100),
  post_done: z.array(z.string().max(200)).max(100),
  refuel_done: z.array(z.string().max(200)).max(100),
  bodyweight_lb: z.number().finite().gt(0).max(2000).nullable(),
  notes: z.string().max(4000),
  sets: z.array(setSchema).max(400),
  /** Weight to use next time, per exercise in the split. */
  next: z.record(uuid, lb),
});

/** Autosave for the whole workout: checklists, sets (added, changed, removed) and next-time weights. */
export async function saveWorkout(raw: unknown): Promise<ActionResult> {
  const p = workoutSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Couldn't save the workout." };
  const ctx = await getContext();
  const w = p.data;
  const { error } = await ctx.supabase
    .from("lift_sessions")
    .update({ date: w.date, pre_done: w.pre_done, post_done: w.post_done, refuel_done: w.refuel_done, bodyweight_lb: w.bodyweight_lb, notes: w.notes })
    .eq("id", w.id);
  if (error) return fail(error);
  const keep = w.sets.map((s) => s.id);
  let del = ctx.supabase.from("lift_sets").delete().eq("session_id", w.id);
  if (keep.length) del = del.not("id", "in", `(${keep.join(",")})`);
  const { error: delErr } = await del;
  if (delErr) return fail(delErr);
  if (w.sets.length) {
    const { error: upErr } = await ctx.supabase.from("lift_sets").upsert(w.sets.map((s) => ({ ...s, session_id: w.id, user_id: ctx.userId })), { onConflict: "id" });
    if (upErr) return fail(upErr);
  }
  for (const [exId, weight] of Object.entries(w.next)) {
    const { error: nErr } = await ctx.supabase.from("lift_exercises").update({ weight_lb: weight }).eq("id", exId);
    if (nErr) return fail(nErr);
  }
  return { ok: true, id: w.id };
}

export async function finishWorkout(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Unknown workout." };
  const ctx = await getContext();
  const { error } = await ctx.supabase.from("lift_sessions").update({ status: "done", finished_at: new Date().toISOString() }).eq("id", id).eq("status", "active");
  revalidatePath("/", "layout");
  return error ? fail(error) : { ok: true, id };
}

export async function deleteWorkout(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Unknown workout." };
  const ctx = await getContext();
  const { error } = await ctx.supabase.from("lift_sessions").delete().eq("id", id);
  revalidatePath("/", "layout");
  return fail(error);
}
