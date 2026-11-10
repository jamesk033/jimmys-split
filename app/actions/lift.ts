"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContext, getDays, getExercises, seedFromTemplate } from "@/lib/data";
import { parseSplit } from "@/lib/import";
import { setsFromDay } from "@/lib/lift";
import { todayIn } from "@/lib/time";
import { fromUnit } from "@/lib/units";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

const uuid = z.string().uuid();
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

/** Your order for the workout tabs. */
export async function saveTabOrder(order: string[]): Promise<ActionResult> {
  const ok = ["pre", "workout", "post", "refuel"];
  if (!Array.isArray(order) || order.length !== 4 || !order.every((k) => ok.includes(k)) || new Set(order).size !== 4) return { ok: false, error: "Unknown tabs." };
  const ctx = await getContext();
  const { error } = await ctx.supabase.from("lift_settings").update({ tab_order: order }).eq("user_id", ctx.userId);
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

/** Deletes every workout and rest day. The split, checklists and key notes stay. */
export async function resetWorkouts(confirm: string): Promise<ActionResult> {
  if (confirm.trim().toUpperCase() !== "DELETE") return { ok: false, error: 'Type DELETE to confirm.' };
  const ctx = await getContext();
  const { error } = await ctx.supabase.from("lift_sessions").delete().eq("user_id", ctx.userId);
  revalidatePath("/", "layout");
  return fail(error);
}

// ---------- choosing a split ----------

/** Wipes the split, exercise list, checklists and key notes. Workouts stay. */
async function clearSplit(ctx: Awaited<ReturnType<typeof getContext>>) {
  for (const t of ["lift_days", "lift_exercises", "lift_checklist_items", "lift_notes"] as const) {
    const { error } = await ctx.supabase.from(t).delete().eq("user_id", ctx.userId);
    if (error) return error;
  }
  return null;
}

/** After sign-up: copy Jimmy's split (days, exercises, notes, checklists; no weights) or start empty. */
export async function chooseSplit(choice: "template" | "own"): Promise<ActionResult> {
  if (choice !== "template" && choice !== "own") return { ok: false, error: "Pick one." };
  const ctx = await getContext();
  if (ctx.settings.setup) return { ok: true };
  const err = await clearSplit(ctx);
  if (err) return fail(err);
  if (choice === "template") await seedFromTemplate(ctx.supabase, ctx.userId);
  const { error } = await ctx.supabase.from("lift_settings").update({ setup: choice }).eq("user_id", ctx.userId);
  revalidatePath("/", "layout");
  return fail(error);
}

/** Settings: replace your split with Jimmy's, or wipe it to build your own. Workouts stay. */
export async function startOver(choice: "template" | "own", confirm: string): Promise<ActionResult> {
  if (choice !== "template" && choice !== "own") return { ok: false, error: "Pick one." };
  if (confirm.trim().toUpperCase() !== "RESET") return { ok: false, error: "Type RESET to confirm." };
  const ctx = await getContext();
  const err = await clearSplit(ctx);
  if (err) return fail(err);
  if (choice === "template") await seedFromTemplate(ctx.supabase, ctx.userId);
  const { error } = await ctx.supabase.from("lift_settings").update({ setup: choice }).eq("user_id", ctx.userId);
  revalidatePath("/", "layout");
  return fail(error);
}

/**
 * Paste-in import: adds the days in order after any you already have. Exercises with a name
 * already in your list are reused (and keep their weight unless the paste gives one).
 */
export async function importSplit(text: string): Promise<ActionResult & { days?: number; exercises?: number }> {
  if (typeof text !== "string" || text.length > 20000) return { ok: false, error: "That's too long." };
  const days = parseSplit(text);
  if (!days.length) return { ok: false, error: "Nothing to import. Put the day name on the first line, then one exercise per line." };
  if (days.length > 30) return { ok: false, error: "Up to 30 days at a time." };
  const ctx = await getContext();
  const existing = await getExercises(ctx);
  const byName = new Map(existing.map((e) => [e.name.trim().toLowerCase(), e.id]));
  let nextPos = Math.max(-1, ...existing.map((e) => e.position)) + 1;
  let created = 0;
  const { data: lastDay } = await ctx.supabase.from("lift_days").select("position").order("position", { ascending: false }).limit(1);
  let dayPos = (lastDay?.[0]?.position ?? -1) + 1;
  for (const d of days) {
    const ids: string[] = [];
    for (const x of d.exercises) {
      const key = x.name.toLowerCase();
      let id = byName.get(key);
      if (!id) {
        id = randomUUID();
        const { error } = await ctx.supabase.from("lift_exercises").insert({ id, user_id: ctx.userId, muscle: x.muscle, name: x.name, equipment: x.equipment, sets: 1, reps: x.reps ?? "4-8", weight_lb: x.weight !== null ? fromUnit(x.weight, ctx.settings.units ?? "lb") : null, position: nextPos++ });
        if (error) return fail(error);
        byName.set(key, id);
        created++;
      } else if (x.weight !== null || x.reps) {
        await ctx.supabase.from("lift_exercises").update({ ...(x.weight !== null ? { weight_lb: fromUnit(x.weight, ctx.settings.units ?? "lb") } : {}), ...(x.reps ? { reps: x.reps } : {}) }).eq("id", id);
      }
      ids.push(id);
    }
    const dayId = randomUUID();
    const { error } = await ctx.supabase.from("lift_days").insert({ id: dayId, user_id: ctx.userId, name: d.name, position: dayPos++ });
    if (error) return fail(error);
    if (ids.length) {
      const { error: e2 } = await ctx.supabase.from("lift_day_exercises").insert(ids.map((exercise_id, position) => ({ user_id: ctx.userId, day_id: dayId, exercise_id, position })));
      if (e2) return fail(e2);
    }
  }
  revalidatePath("/", "layout");
  return { ok: true, days: days.length, exercises: created };
}

/**
 * "Edit as text": the text becomes the whole split. Days are rebuilt in the order written.
 * Exercises are matched by name, so their notes, alternatives and history stay; new names are added;
 * exercises left on no day are removed. Weight and rep range come from the text.
 */
export async function replaceSplit(text: string): Promise<ActionResult> {
  if (typeof text !== "string" || text.length > 30000) return { ok: false, error: "That's too long." };
  const days = parseSplit(text);
  if (days.length > 40) return { ok: false, error: "Up to 40 days." };
  const ctx = await getContext();
  if (ctx.guest) return { ok: false, error: "Make a free account to edit a split." };
  const units = ctx.settings.units ?? "lb";
  const existing = await getExercises(ctx);
  const byName = new Map(existing.map((e) => [e.name.trim().toLowerCase(), e]));
  const ids = new Map<string, string>();
  let nextPos = Math.max(-1, ...existing.map((e) => e.position)) + 1;
  for (const d of days)
    for (const x of d.exercises) {
      const key = x.name.toLowerCase();
      if (ids.has(key)) continue;
      const row = { muscle: x.muscle, name: x.name, equipment: x.equipment, weight_lb: x.weight === null ? null : fromUnit(x.weight, units), reps: x.reps ?? "4-8" };
      const found = byName.get(key);
      if (found) {
        const { error } = await ctx.supabase.from("lift_exercises").update(row).eq("id", found.id);
        if (error) return fail(error);
        ids.set(key, found.id);
      } else {
        const id = randomUUID();
        const { error } = await ctx.supabase.from("lift_exercises").insert({ id, user_id: ctx.userId, sets: 1, ...row, position: nextPos++ });
        if (error) return fail(error);
        ids.set(key, id);
      }
    }
  const { error: delErr } = await ctx.supabase.from("lift_days").delete().eq("user_id", ctx.userId);
  if (delErr) return fail(delErr);
  for (let i = 0; i < days.length; i++) {
    const dayId = randomUUID();
    const { error } = await ctx.supabase.from("lift_days").insert({ id: dayId, user_id: ctx.userId, name: days[i].name, position: i });
    if (error) return fail(error);
    const order = [...new Set(days[i].exercises.map((x) => ids.get(x.name.toLowerCase())!))];
    if (order.length) {
      const { error: e2 } = await ctx.supabase.from("lift_day_exercises").insert(order.map((exercise_id, position) => ({ user_id: ctx.userId, day_id: dayId, exercise_id, position })));
      if (e2) return fail(e2);
    }
  }
  await pruneUnused(ctx);
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------- exercise list ----------

const exerciseSchema = z.object({
  id: uuid.optional(),
  muscle: z.string().trim().max(60),
  name: z.string().trim().min(1, "Name the exercise.").max(120),
  equipment: z.string().trim().max(120),
  sets: z.number().int().min(1).max(20),
  reps: z.string().trim().max(20),
  weight_lb: lb,
  note: z.string().max(500),
  alternative: z.string().max(200),
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
  const { data: last } = await ctx.supabase.from("lift_exercises").select("position").order("position", { ascending: false }).limit(1);
  const { data, error } = await ctx.supabase.from("lift_exercises").insert({ ...row, user_id: ctx.userId, position: (last?.[0]?.position ?? -1) + 1 }).select("id").single();
  if (error) return fail(error);
  revalidatePath("/split");
  return { ok: true, id: data.id };
}

/** Removes it from the list and every day. Past workouts keep their sets. */
export async function deleteExercise(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Unknown exercise." };
  const ctx = await getContext();
  const { error } = await ctx.supabase.from("lift_exercises").delete().eq("id", id);
  revalidatePath("/split");
  return fail(error);
}

/** An exercise that's on no day leaves the exercise list. Past workouts keep their sets. */
async function pruneUnused(ctx: Awaited<ReturnType<typeof getContext>>) {
  const [{ data: used }, { data: all }] = await Promise.all([
    ctx.supabase.from("lift_day_exercises").select("exercise_id"),
    ctx.supabase.from("lift_exercises").select("id"),
  ]);
  const keep = new Set((used ?? []).map((r) => String(r.exercise_id)));
  const gone = (all ?? []).map((r) => String(r.id)).filter((id) => !keep.has(id));
  if (gone.length) await ctx.supabase.from("lift_exercises").delete().in("id", gone);
}

// ---------- workout days ----------

export async function saveDay(raw: unknown): Promise<ActionResult> {
  const p = z.object({ id: uuid.optional(), name: z.string().trim().min(1, "Name the day.").max(60) }).safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Check the day." };
  const ctx = await getContext();
  const { id, name } = p.data;
  if (id) return fail((await ctx.supabase.from("lift_days").update({ name }).eq("id", id)).error);
  const { data: last } = await ctx.supabase.from("lift_days").select("position").order("position", { ascending: false }).limit(1);
  const { data, error } = await ctx.supabase.from("lift_days").insert({ name, user_id: ctx.userId, position: (last?.[0]?.position ?? -1) + 1 }).select("id").single();
  if (error) return fail(error);
  revalidatePath("/split");
  return { ok: true, id: data.id };
}

export async function deleteDay(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Unknown day." };
  const ctx = await getContext();
  const { error } = await ctx.supabase.from("lift_days").delete().eq("id", id);
  if (!error) await pruneUnused(ctx);
  revalidatePath("/", "layout");
  return fail(error);
}

/** Sets a day's exercises (in order) in one go. */
export async function setDayExercises(dayId: string, exerciseIds: string[]): Promise<ActionResult> {
  if (!uuid.safeParse(dayId).success || !z.array(uuid).max(60).safeParse(exerciseIds).success) return { ok: false, error: "Unknown exercises." };
  const ctx = await getContext();
  // Only exercises that still exist; anything else is skipped instead of failing the whole day.
  const { data: real } = exerciseIds.length ? await ctx.supabase.from("lift_exercises").select("id").in("id", exerciseIds) : { data: [] };
  const ok = new Set((real ?? []).map((r) => String(r.id)));
  const keep = exerciseIds.filter((id) => ok.has(id));
  // Add the new rows first and only then remove the old ones, so a failed save never empties the day.
  const { data: old, error: readErr } = await ctx.supabase.from("lift_day_exercises").select("id").eq("day_id", dayId);
  if (readErr) return fail(readErr);
  if (keep.length) {
    const { error: e2 } = await ctx.supabase.from("lift_day_exercises").insert(keep.map((exercise_id, position) => ({ user_id: ctx.userId, day_id: dayId, exercise_id, position })));
    if (e2) return fail(e2);
  }
  const oldIds = (old ?? []).map((r) => String(r.id));
  if (oldIds.length) {
    const { error } = await ctx.supabase.from("lift_day_exercises").delete().in("id", oldIds);
    if (error) return fail(error);
  }
  await pruneUnused(ctx);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Adds an exercise to the end of a day: an existing one by name, or a new one. Done in one step on the server. */
export async function addToDay(dayId: string, rawName: string): Promise<ActionResult> {
  const name = rawName.trim().slice(0, 120);
  if (!uuid.safeParse(dayId).success || !name) return { ok: false, error: "Type an exercise name." };
  const ctx = await getContext();
  const { data: found } = await ctx.supabase.from("lift_exercises").select("id").ilike("name", name.replace(/[%_\\]/g, "\\$&")).limit(1);
  let id = found?.[0]?.id ? String(found[0].id) : null;
  if (!id) {
    id = randomUUID();
    const { data: last } = await ctx.supabase.from("lift_exercises").select("position").order("position", { ascending: false }).limit(1);
    const { error } = await ctx.supabase.from("lift_exercises").insert({ id, user_id: ctx.userId, muscle: "", name: name[0].toUpperCase() + name.slice(1), equipment: "", sets: 1, reps: "4-8", position: (last?.[0]?.position ?? -1) + 1 });
    if (error) return fail(error);
  }
  const { data: lastItem } = await ctx.supabase.from("lift_day_exercises").select("position").eq("day_id", dayId).order("position", { ascending: false }).limit(1);
  const { error } = await ctx.supabase.from("lift_day_exercises").insert({ user_id: ctx.userId, day_id: dayId, exercise_id: id, position: (lastItem?.[0]?.position ?? -1) + 1 });
  if (error) return fail(error);
  revalidatePath("/", "layout");
  return { ok: true, id };
}

/** Saves a new order for one list. */
export async function reorder(table: "lift_exercises" | "lift_days" | "lift_checklist_items" | "lift_notes", ids: string[]): Promise<ActionResult> {
  if (!["lift_exercises", "lift_days", "lift_checklist_items", "lift_notes"].includes(table)) return { ok: false, error: "Unknown list." };
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

/** Starts a day from the split at the current weights, or reopens the workout already going. */
export async function startWorkout(dayId: string): Promise<ActionResult> {
  if (!uuid.safeParse(dayId).success) return { ok: false, error: "Pick a day." };
  const ctx = await getContext();
  const { data: open } = await ctx.supabase.from("lift_sessions").select("id").eq("status", "active").maybeSingle();
  if (open) return { ok: true, id: open.id };
  const day = (await getDays(ctx)).find((d) => d.id === dayId);
  if (!day) return { ok: false, error: "That day isn't in your split anymore." };
  const id = randomUUID();
  const { error } = await ctx.supabase.from("lift_sessions").insert({ id, user_id: ctx.userId, date: todayIn(ctx.settings.timezone), day_id: day.id, day_name: day.name, status: "active" });
  if (error) return fail(error);
  const sets = setsFromDay(day, await getExercises(ctx), id, randomUUID);
  if (sets.length) {
    const { error: e2 } = await ctx.supabase.from("lift_sets").insert(sets.map((s) => ({ ...s, user_id: ctx.userId })));
    if (e2) return fail(e2);
  }
  revalidatePath("/", "layout");
  return { ok: true, id };
}

/** Logs today as a rest day. The rotation doesn't move. */
export async function logRestDay(): Promise<ActionResult> {
  const ctx = await getContext();
  const date = todayIn(ctx.settings.timezone);
  const { data: already } = await ctx.supabase.from("lift_sessions").select("id").eq("date", date).eq("rest", true).maybeSingle();
  if (already) return { ok: true, id: already.id };
  const now = new Date().toISOString();
  const { data, error } = await ctx.supabase.from("lift_sessions").insert({ user_id: ctx.userId, date, day_name: "Rest", rest: true, status: "done", finished_at: now }).select("id").single();
  revalidatePath("/", "layout");
  return error ? fail(error) : { ok: true, id: data.id };
}

const setSchema = z.object({
  id: uuid,
  exercise_id: uuid.nullable(),
  name: z.string().trim().min(1).max(120),
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
    const { error: upErr } = await ctx.supabase.from("lift_sets").upsert(w.sets.map((s) => ({ ...s, done: (s.reps ?? 0) > 0, session_id: w.id, user_id: ctx.userId })), { onConflict: "id" });
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
