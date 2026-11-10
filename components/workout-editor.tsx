"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { deleteWorkout, finishWorkout, saveExercise, saveTabOrder, saveWorkout } from "@/app/actions/lift";
import { groupSets, isDone, setsDone, shouldGoUp, volume, type Best } from "@/lib/lift";
import { longDate } from "@/lib/time";
import { type ChecklistItem, type ChecklistKind, type Exercise, type SessionWithSets, type SetRow, type Units } from "@/lib/types";
import { fmtBig, fmtWeight, fromUnit, stepFor, toUnit } from "@/lib/units";
import { IconCheck, IconDown, IconPlus, IconTrophy, IconUp, IconX } from "./icons";
import { ConfirmDelete } from "./confirm-delete";
import { WorkoutShare } from "./share-cards";
import { NumField } from "./num-field";
import { SaveBadge, useAutosave } from "./use-autosave";
import { Badge, Button, Card, Empty, Input, Label, PageHeader, Progress, Textarea, buttonClass, cx } from "./ui";

type Tab = "pre" | "workout" | "post" | "refuel";

type Group = ReturnType<typeof groupSets>[number];

/** Change an exercise mid-workout: details save to your exercise list; swap and remove only touch this workout. */
function EditPanel({ g, ex, onSaved, onRename, onSwap, onRemove, preview }: { g: Group; ex?: Exercise; onSaved: (e: Exercise) => void; onRename: (name: string, target: string) => void; onSwap: (name: string) => void; onRemove: () => void; preview: boolean }) {
  const [v, setV] = useState({ name: ex?.name ?? g.name, muscle: ex?.muscle ?? "", equipment: ex?.equipment ?? "", reps: ex?.reps ?? g.target, note: ex?.note ?? "", alternative: ex?.alternative ?? "" });
  const name = v.name.trim() || g.name;
  // Saves to the exercise list on its own (exercises from the split only).
  const save = useAutosave(ex ? { id: ex.id, muscle: v.muscle, name, equipment: v.equipment, sets: ex.sets, reps: v.reps, weight_lb: ex.weight_lb, note: v.note, alternative: v.alternative } : null, saveExercise, { enabled: !!ex && !preview });
  const update = (patch: Partial<typeof v>) => {
    const next = { ...v, ...patch };
    setV(next);
    if (ex) {
      onSaved({ ...ex, ...next, name: next.name.trim() || ex.name });
      onRename(next.name.trim() || g.name, next.reps);
    }
  };
  return (
    <div className="mb-3 grid gap-2 rounded-xl border border-accent/40 bg-bg p-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="col-span-2 grid min-w-0 gap-1 text-[12px] text-muted">
          Exercise
          <Input
            value={v.name}
            onChange={(e) => update({ name: e.target.value })}
            // A one-off exercise is renamed when you leave the box, so the card doesn't jump while typing.
            onBlur={() => !ex && onRename(name, v.reps)}
            maxLength={120}
          />
        </label>
        {ex && (
          <>
            <label className="grid min-w-0 gap-1 text-[12px] text-muted">
              Muscle
              <Input value={v.muscle} onChange={(e) => update({ muscle: e.target.value })} maxLength={60} />
            </label>
            <label className="grid min-w-0 gap-1 text-[12px] text-muted">
              Equipment
              <Input value={v.equipment} onChange={(e) => update({ equipment: e.target.value })} maxLength={120} />
            </label>
          </>
        )}
        <label className="grid min-w-0 gap-1 text-[12px] text-muted">
          Rep range
          <Input value={v.reps} onChange={(e) => update({ reps: e.target.value })} onBlur={() => !ex && onRename(name, v.reps)} maxLength={20} placeholder="4-8" />
        </label>
        {ex && (
          <label className="grid min-w-0 gap-1 text-[12px] text-muted">
            Alternative
            <Input value={v.alternative} onChange={(e) => update({ alternative: e.target.value })} maxLength={200} />
          </label>
        )}
        {ex && (
          <label className="col-span-2 grid min-w-0 gap-1 text-[12px] text-muted">
            Notes
            <Textarea value={v.note} onChange={(e) => update({ note: e.target.value })} maxLength={500} className="min-h-16" />
          </label>
        )}
      </div>
      {ex && (save.state !== "idle" ? <SaveBadge state={save.state} error={save.error} /> : <p className="text-[12px] text-muted">Saves on its own to your exercise list, so every day that uses it updates.</p>)}
      <div className="flex flex-wrap gap-2">
        {ex?.alternative && (
          <Button variant="ghost" onClick={() => onSwap(ex.alternative)} disabled={preview}>
            Swap to alternative today
          </Button>
        )}
        {!preview && (
          <ConfirmDelete label="Remove from this workout" confirmText="Remove?" onConfirm={onRemove} className="min-h-11 border border-loss/40 px-3">
            Remove from this workout
          </ConfirmDelete>
        )}
      </div>
    </div>
  );
}

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

function Checklist({ items, done, onToggle, empty }: { items: ChecklistItem[]; done: string[]; onToggle: (body: string) => void; empty: string }) {
  if (!items.length)
    return (
      <Empty title="Nothing on this list yet">
        <Link href="/notes" className="text-accent">
          {empty}
        </Link>
      </Empty>
    );
  return (
    <ul className="grid gap-2">
      {items.map((i) => {
        const on = done.includes(i.body);
        return (
          <li key={i.id}>
            <button
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => onToggle(i.body)}
              className={cx("flex min-h-14 w-full items-center gap-3 rounded-xl border px-4 text-left text-[16px] transition", on ? "border-win/40 bg-win/10 text-ink" : "border-line bg-bg hover:border-accent/50")}
            >
              <span className={cx("grid h-7 w-7 shrink-0 place-items-center rounded-lg border", on ? "border-win bg-win text-black" : "border-line")}>{on && <IconCheck width={18} height={18} />}</span>
              <span className={cx(on && "text-muted line-through decoration-muted/60")}>{i.body}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function WorkoutEditor({
  session,
  split,
  checklist,
  units,
  prs = [],
  justFinished = false,
  nextName,
  preview = false,
  tabOrder = [],
  share,
}: {
  session: SessionWithSets;
  /** The exercise list (for notes and next-time weights). */
  split: Exercise[];
  checklist: ChecklistItem[];
  units: Units;
  prs?: Best[];
  justFinished?: boolean;
  /** Next day in the rotation, shown after finishing. */
  nextName?: string;
  preview?: boolean;
  /** Your order for the tabs (saved in Settings data); empty = Pre-lift, Workout, Post-lift, Refuel. */
  tabOrder?: string[];
  /** Finished workouts: username for the picture, and whether the Discord channel is set up. */
  share?: { handle: string; discord: boolean };
}) {
  const router = useRouter();
  const live = session.status === "active";
  const [sets, setSets] = useState<SetRow[]>(session.sets);
  const [pre, setPre] = useState(session.pre_done);
  const [post, setPost] = useState(session.post_done);
  const [refuel, setRefuel] = useState(session.refuel_done);
  const [bodyweight, setBodyweight] = useState<number | null>(session.bodyweight_lb);
  const [notes, setNotes] = useState(session.notes);
  const [date, setDate] = useState(session.date);
  /** Only weights you touch are sent, so an old workout never overwrites newer split weights. */
  const [next, setNext] = useState<Record<string, number | null>>({});
  const [extra, setExtra] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const [exList, setExList] = useState(split);
  const [editing, setEditing] = useState<string | null>(null);

  const items = (k: ChecklistKind) => checklist.filter((c) => c.kind === k).sort((a, b) => a.position - b.position);
  const preItems = items("pre");
  const postItems = items("post");
  const refuelItems = items("refuel");
  const count = (list: ChecklistItem[], done: string[]) => list.filter((i) => done.includes(i.body)).length;

  const DEFAULT_ORDER: Tab[] = ["pre", "workout", "post", "refuel"];
  const [order, setOrder] = useState<Tab[]>(() => (tabOrder.length === 4 && DEFAULT_ORDER.every((k) => tabOrder.includes(k)) ? (tabOrder as Tab[]) : DEFAULT_ORDER));
  const [reordering, setReordering] = useState(false);
  const [orderErr, setOrderErr] = useState("");
  const [tab, setTab] = useState<Tab>(() => {
    if (setsDone(session.sets) || !live) return "workout";
    const first = order[0];
    if (first === "pre" && !(preItems.length && count(preItems, session.pre_done) < preItems.length)) return "workout";
    return first;
  });
  const moveTab = (i: number, d: -1 | 1) => {
    const next = [...order];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setOrder(next);
    if (!preview)
      saveTabOrder(next)
        .then((r) => setOrderErr(r.ok ? "" : r.error))
        .catch(() => setOrderErr("Couldn't save. Check your connection."));
  };

  const payload = useMemo(
    () => ({ id: session.id, date, pre_done: pre, post_done: post, refuel_done: refuel, bodyweight_lb: bodyweight, notes, sets, next }),
    [session.id, date, pre, post, refuel, bodyweight, notes, sets, next],
  );
  const save = useAutosave(payload, saveWorkout, { enabled: !preview });

  const groups = groupSets(sets);
  const doneCount = setsDone(sets);
  const splitById = new Map(exList.map((e) => [e.id, e]));
  const inGroup = (g: Group, s: SetRow) => s.position === g.position && s.name === g.name;
  const step = stepFor(units);

  const toggle = (list: string[], set: (v: string[]) => void, body: string) => set(list.includes(body) ? list.filter((b) => b !== body) : [...list, body]);

  const patchSet = (id: string, patch: Partial<SetRow>) =>
    setSets((all) => {
      const target = all.find((s) => s.id === id);
      if (!target) return all;
      return all.map((s) => {
        if (s.id === id) return { ...s, ...patch };
        // A new weight carries down to the later, unchecked sets of the same exercise that had the old weight.
        if ("weight_lb" in patch && s.position === target.position && s.name === target.name && s.set_no > target.set_no && !isDone(s) && s.weight_lb === target.weight_lb) return { ...s, weight_lb: patch.weight_lb ?? null };
        return s;
      });
    });

  const addSet = (g: Group) => {
    const last = g.sets[g.sets.length - 1];
    setSets((all) => [...all, { ...last, id: newId(), set_no: last.set_no + 1, done: false }]);
  };
  const removeSet = (id: string) =>
    setSets((all) => {
      const gone = all.find((s) => s.id === id);
      if (!gone) return all;
      return all.filter((s) => s.id !== id).map((s) => (s.position === gone.position && s.name === gone.name && s.set_no > gone.set_no ? { ...s, set_no: s.set_no - 1 } : s));
    });
  const addExercise = () => {
    const name = extra.trim();
    if (!name) return;
    const pos = Math.max(-1, ...sets.map((s) => s.position)) + 1;
    setSets((all) => [...all, ...[1, 2, 3].map((n) => ({ id: newId(), session_id: session.id, exercise_id: null, name, target_reps: "", position: pos, set_no: n, weight_lb: null, reps: null, done: false }))]);
    setExtra("");
  };

  const nextWeight = (exId: string) => (exId in next ? next[exId] : (splitById.get(exId)?.weight_lb ?? null));

  const finish = () =>
    start(async () => {
      setMsg("");
      await save.flush();
      const res = await finishWorkout(session.id);
      if (!res.ok) return setMsg(res.error);
      router.push(`/history/${session.id}?done=1`);
      router.refresh();
    });

  const remove = async () => {
    const res = await deleteWorkout(session.id);
    if (!res.ok) return setMsg(res.error);
    router.push("/history");
    router.refresh();
  };

  const TABS: [Tab, string, string][] = [
    ["pre", "Pre-lift", `${count(preItems, pre)}/${preItems.length}`],
    ["workout", "Workout", `${doneCount}/${sets.length}`],
    ["post", "Post-lift", `${count(postItems, post)}/${postItems.length}`],
    ["refuel", "Refuel", `${count(refuelItems, refuel)}/${refuelItems.length}`],
  ];

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow={live ? "Workout in progress" : longDate(date)}
        title={session.day_name || "Workout"}
        sub={`${doneCount} of ${sets.length} sets done · ${fmtBig(volume(sets), units)} moved`}
        action={!preview && <SaveBadge state={save.state} error={save.error} />}
      />

      {justFinished && (
        <Card className="border-win/40 bg-win/5">
          <div className="text-[20px] font-bold text-win">Workout done. Rest up.</div>
          {nextName && <p className="mt-1 text-[14px] text-muted">Next up is {nextName} whenever you&apos;re ready.</p>}
        </Card>
      )}

      {prs.length > 0 && (
        <Card title="New PRs" action={<IconTrophy className="text-amber-300" />}>
          <ul className="grid gap-1.5">
            {prs.map((p) => (
              <li key={p.name} className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold">{p.name}</span>
                <span className="text-[14px] text-muted">
                  {fmtWeight(p.weight, units)} x {p.reps} · est. max <span className="font-semibold text-amber-300">{fmtWeight(p.e1rm, units)}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Progress value={sets.length ? doneCount / sets.length : 0} tone={doneCount === sets.length && sets.length ? "win" : "accent"} label="Sets done" />

      <div data-guest-ok className="flex items-stretch gap-1">
      <div role="tablist" aria-label="Workout parts" className="grid min-w-0 flex-1 grid-cols-4 gap-1 rounded-xl border border-line bg-panel p-1">
        {order.map((k) => TABS.find((t) => t[0] === k)!).map(([k, label, c]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cx("grid min-h-12 place-items-center content-center rounded-lg text-[13px] sm:text-[14px]", tab === k ? "bg-accent font-semibold text-accent-ink" : "text-muted hover:text-ink")}
          >
            {label}
            <span className={cx("text-[11px] tabular-nums", tab === k ? "text-accent-ink/80" : "text-muted")}>{c}</span>
          </button>
        ))}
      </div>
        <button
          type="button"
          aria-pressed={reordering}
          aria-label="Reorder tabs"
          title="Reorder tabs"
          onClick={() => setReordering((x) => !x)}
          className={cx("grid w-10 shrink-0 place-items-center rounded-xl border border-line text-[17px]", reordering ? "bg-accent text-accent-ink" : "bg-panel text-muted hover:text-ink")}
        >
          ⇅
        </button>
      </div>

      {reordering && (
        <div data-guest-ok className="rounded-2xl border border-accent/50 bg-panel p-3">
          <p className="mb-2 text-[13px] text-muted">Use the arrows to put the tabs in your order. Saves on its own; tap ⇅ to close.</p>
          <ol className="grid gap-1.5">
            {order.map((k, i) => (
              <li key={k} className="flex items-center gap-1 rounded-xl border border-line bg-bg pl-4 pr-1 text-[15px] font-semibold">
                <span className="flex-1 py-2.5">{TABS.find((t) => t[0] === k)![1]}</span>
                <button type="button" aria-label={`Move ${k} up`} disabled={i === 0} onClick={() => moveTab(i, -1)} className="grid h-11 w-10 place-items-center rounded-lg text-muted hover:text-ink disabled:opacity-30">
                  <IconUp width={18} height={18} />
                </button>
                <button type="button" aria-label={`Move ${k} down`} disabled={i === order.length - 1} onClick={() => moveTab(i, 1)} className="grid h-11 w-10 place-items-center rounded-lg text-muted hover:text-ink disabled:opacity-30">
                  <IconDown width={18} height={18} />
                </button>
              </li>
            ))}
          </ol>
          {orderErr && <p className="mt-2 text-[13px] text-loss">{orderErr}</p>}
        </div>
      )}

      {tab === "pre" && (
        <Card title="Pre-lift checklist">
          <Checklist items={preItems} done={pre} onToggle={(b) => toggle(pre, setPre, b)} empty="Add your pre-lift checklist in Key notes" />
        </Card>
      )}

      {tab === "workout" && (
        <div className="grid gap-3">
          {!groups.length && <Empty title="No exercises in this workout">Add one below, or set up your split first.</Empty>}
          {groups.map((g) => {
            const ex = g.exerciseId ? splitById.get(g.exerciseId) : undefined;
            const all = g.sets.every(isDone);
            const hit = g.sets.find((s) => isDone(s) && shouldGoUp(g.target, s.reps));
            return (
              <Card key={g.key} className={cx(all && "border-win/40")}>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {ex?.muscle && <div className="text-[12px] font-semibold uppercase tracking-wide text-accent">{ex.muscle}</div>}
                    <h2 className="text-[17px] font-semibold">{g.name}</h2>
                    <div className="text-[13px] text-muted">
                      {g.sets.length} {g.sets.length === 1 ? "set" : "sets"}
                      {g.target ? ` x ${g.target}` : ""}
                    </div>
                    {ex?.equipment && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {ex.equipment.split(",").map((q) => (
                          <Badge key={q}>{q.trim()}</Badge>
                        ))}
                      </div>
                    )}
                    {ex?.note && <p className="mt-1.5 text-[13px] leading-snug text-ink/80">{ex.note}</p>}
                    {ex?.alternative && <p className="mt-0.5 text-[12px] text-muted">Alt: {ex.alternative}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {all && <Badge tone="win">Done</Badge>}
                    <button type="button" onClick={() => setEditing(editing === g.key ? null : g.key)} className="min-h-9 rounded-lg border border-line px-3 text-[13px] text-muted hover:text-ink">
                      {editing === g.key ? "Close" : "Edit"}
                    </button>
                  </div>
                </div>
                {editing === g.key && (
                  <EditPanel
                    g={g}
                    ex={ex}
                    preview={preview}
                    onSaved={(e) => setExList((l) => l.map((x) => (x.id === e.id ? e : x)))}
                    onRename={(name, target) => setSets((all) => all.map((s) => (inGroup(g, s) ? { ...s, name, target_reps: target } : s)))}
                    onSwap={(name) => {
                      setSets((all) => all.map((s) => (inGroup(g, s) ? { ...s, name: name.slice(0, 120), exercise_id: null } : s)));
                      setEditing(null);
                    }}
                    onRemove={() => {
                      setSets((all) => all.filter((s) => !inGroup(g, s)));
                      setEditing(null);
                    }}
                  />
                )}

                <div className="grid grid-cols-[2.75rem_1fr_1fr_2.75rem] items-center gap-2 px-0.5 pb-1 text-[11px] uppercase tracking-wide text-muted">
                  <span>Set</span>
                  <span className="text-center">{units}</span>
                  <span className="text-center">Reps</span>
                  <span />
                </div>
                <ul className="grid gap-2">
                  {g.sets.map((s) => {
                    const done = isDone(s);
                    return (
                    <li key={s.id} className="grid grid-cols-[2.75rem_1fr_1fr_2.75rem] items-center gap-2">
                      {/* Set number, not a checkbox: typing reps is what logs the set. */}
                      <span className={cx("grid h-11 w-11 place-items-center rounded-xl text-[15px] font-semibold tabular-nums", done ? "text-win" : "text-muted")} aria-label={`Set ${s.set_no}${done ? ", logged" : ""}`}>
                        {s.set_no}
                      </span>
                      <NumField label={`Set ${s.set_no} weight in ${units}`} value={toUnit(s.weight_lb, units)} onChange={(v) => patchSet(s.id, { weight_lb: fromUnit(v, units) })} placeholder="0" className={cx(done && "border-win/30")} />
                      <NumField label={`Set ${s.set_no} reps`} decimals={false} value={s.reps} onChange={(v) => patchSet(s.id, { reps: v, done: v !== null && v > 0 })} placeholder={g.target || "0"} className={cx(done && "border-win/30")} />
                      <ConfirmDelete label={`Remove set ${s.set_no}`} confirmText="Sure?" className="min-h-11 w-full px-0 text-[11px]" onConfirm={() => removeSet(s.id)}>
                        <IconX width={18} height={18} />
                      </ConfirmDelete>
                    </li>
                    );
                  })}
                </ul>

                {hit && (
                  <p className="mt-3 rounded-lg bg-win/10 px-3 py-2 text-[13px] font-semibold text-win">
                    Hit {hit.reps} reps. Go up next time.
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                  <button type="button" onClick={() => addSet(g)} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-[14px] font-semibold text-accent">
                    <IconPlus width={18} height={18} /> Set
                  </button>
                  {g.exerciseId && ex && (
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-muted">Next time</span>
                      <button type="button" aria-label={`Lower next weight by ${step} ${units}`} onClick={() => setNext((n) => ({ ...n, [ex.id]: fromUnit(Math.max(0, (toUnit(nextWeight(ex.id), units) ?? 0) - step), units) }))} className="grid h-11 w-10 place-items-center rounded-lg border border-line text-[18px] text-muted hover:text-ink">
                        −
                      </button>
                      <NumField label={`${g.name} weight next time in ${units}`} value={toUnit(nextWeight(ex.id), units)} onChange={(v) => setNext((n) => ({ ...n, [ex.id]: fromUnit(v, units) }))} className="w-20" placeholder="0" />
                      <button type="button" aria-label={`Raise next weight by ${step} ${units}`} onClick={() => setNext((n) => ({ ...n, [ex.id]: fromUnit((toUnit(nextWeight(ex.id), units) ?? 0) + step, units) }))} className="grid h-11 w-10 place-items-center rounded-lg border border-line text-[18px] text-muted hover:text-ink">
                        +
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}

          <Card>
            <Label htmlFor="extra">Add an exercise to this workout only</Label>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                addExercise();
              }}
            >
              <Input id="extra" value={extra} onChange={(e) => setExtra(e.target.value)} maxLength={80} placeholder="e.g. Face pulls" />
              <Button type="submit" variant="subtle" disabled={!extra.trim()}>
                Add
              </Button>
            </form>
            <p className="mt-2 text-[12px] text-muted">
              To change it for every workout, edit your{" "}
              <Link href="/split" className="text-accent">
                split
              </Link>
              .
            </p>
          </Card>
        </div>
      )}

      {tab === "post" && (
        <>
          <Card title="Post-lift checklist">
            <Checklist items={postItems} done={post} onToggle={(b) => toggle(post, setPost, b)} empty="Add your post-lift checklist in Key notes" />
          </Card>
          <Card title="After the workout">
            <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
              <div>
                <Label htmlFor="bw">Bodyweight ({units})</Label>
                <NumField id="bw" label={`Bodyweight in ${units}`} value={toUnit(bodyweight, units)} onChange={(v) => setBodyweight(v && v > 0 ? fromUnit(v, units) : null)} placeholder="Optional" />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={4000} placeholder="How it felt, what to change next time" />
              </div>
              {!live && (
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
                </div>
              )}
            </div>
          </Card>
        </>
      )}

      {tab === "refuel" && (
        <Card title="Refueling">
          <Checklist items={refuelItems} done={refuel} onToggle={(b) => toggle(refuel, setRefuel, b)} empty="Add your refueling list in Key notes" />
        </Card>
      )}

      {msg && (
        <p role="alert" className="text-[14px] text-loss">
          {msg}
        </p>
      )}

      {live ? (
        <Button onClick={finish} disabled={pending || preview} className="min-h-12 w-full text-[16px]">
          {pending ? "Finishing…" : doneCount < sets.length ? `Finish workout (${sets.length - doneCount} sets left)` : "Finish workout"}
        </Button>
      ) : (
        <>
        {share && (
          <Card title="Share">
            <WorkoutShare
              filename={`${(session.day_name || "workout").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${date}.png`}
              discord={share.discord ? { title: `${session.day_name || "Workout"} · ${longDate(date)}`, session: session.id } : null}
              data={{
                dayName: session.day_name || "Workout",
                dateLabel: longDate(date),
                setsDone: doneCount,
                setsTotal: sets.length,
                volume: fmtBig(volume(sets), units),
                handle: share.handle,
                exercises: groups.map((g) => {
                  const top = [...g.sets].filter((x) => x.done && x.weight_lb !== null).sort((a, b) => (b.weight_lb ?? 0) - (a.weight_lb ?? 0))[0];
                  const ex = g.exerciseId ? splitById.get(g.exerciseId) : undefined;
                  return {
                    muscle: ex?.muscle ?? "",
                    name: g.name,
                    top: top ? `${fmtWeight(top.weight_lb, units)} x ${top.reps ?? "?"}` : g.sets.some((x) => x.done) ? `${g.sets.find((x) => x.done)?.reps ?? "?"} reps` : "skipped",
                    pr: prs.some((p) => p.name.trim().toLowerCase() === g.name.trim().toLowerCase()),
                  };
                }),
              }}
            />
          </Card>
        )}
        <div className="flex flex-wrap justify-between gap-2">
          <Link href="/history" className={buttonClass("ghost")}>
            All workouts
          </Link>
          {!preview && (
            <ConfirmDelete label="Delete workout" onConfirm={remove} className="min-h-11 border border-loss/40 px-4">
              Delete workout
            </ConfirmDelete>
          )}
        </div>
        </>
      )}
    </div>
  );
}
