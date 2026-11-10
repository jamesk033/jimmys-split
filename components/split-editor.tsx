"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { deleteDay, deleteExercise, importSplit, reorder, saveDay, saveExercise, setDayExercises } from "@/app/actions/lift";
import { parseSplit } from "@/lib/import";
import type { Exercise, Units, WorkoutDay } from "@/lib/types";
import { exerciseLabel } from "@/lib/types";
import { fmtWeight, fromUnit, toUnit } from "@/lib/units";
import { IconChevronDown, IconDown, IconTrash, IconUp, IconX } from "./icons";
import { ConfirmDelete } from "./confirm-delete";
import { NumField } from "./num-field";
import { SaveBadge, useAutosave } from "./use-autosave";
import { Button, Card, Empty, Input, PageHeader, Textarea, cx } from "./ui";

type Tab = "days" | "list";

function Arrows({ label, first, last, onMove }: { label: string; first: boolean; last: boolean; onMove: (d: -1 | 1) => void }) {
  return (
    <>
      <button type="button" aria-label={`Move ${label} up`} disabled={first} onClick={() => onMove(-1)} className="grid h-11 w-9 place-items-center rounded-lg text-muted hover:text-ink disabled:opacity-30">
        <IconUp width={18} height={18} />
      </button>
      <button type="button" aria-label={`Move ${label} down`} disabled={last} onClick={() => onMove(1)} className="grid h-11 w-9 place-items-center rounded-lg text-muted hover:text-ink disabled:opacity-30">
        <IconDown width={18} height={18} />
      </button>
    </>
  );
}

// ---------- one day in the rotation ----------

function DayCard({ day, index, total, exercises, units, onMove, onDeleted, preview }: { day: WorkoutDay; index: number; total: number; exercises: Exercise[]; units: Units; onMove: (d: -1 | 1) => void; onDeleted: () => void; preview: boolean }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(day.name);
  const [ids, setIds] = useState(day.exerciseIds);
  const router = useRouter();
  const [pick, setPick] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const byName = new Map(exercises.map((e) => [e.name.trim().toLowerCase(), e.id]));
  const nameSave = useAutosave({ id: day.id, name: name.trim() || day.name }, saveDay, { enabled: !preview });
  useEffect(() => setIds(day.exerciseIds), [day.exerciseIds]);

  const commit = (next: string[]) => {
    setIds(next);
    if (!preview)
      start(async () => {
        const res = await setDayExercises(day.id, next);
        setErr(res.ok ? "" : res.error);
        // Something taken off its last day leaves the exercise list, so reload it.
        if (res.ok) router.refresh();
      });
  };
  const add = () => {
    const name = pick.trim();
    if (!name) return;
    const existing = byName.get(name.toLowerCase());
    if (existing) {
      commit([...ids, existing]);
      setPick("");
      return;
    }
    start(async () => {
      setErr("");
      const res = await saveExercise({ muscle: "", name, equipment: "", sets: 1, reps: "4-8", weight_lb: null, note: "", alternative: "" });
      if (!res.ok || !res.id) return setErr(res.ok ? "Couldn't add it." : res.error);
      const next = [...ids, res.id];
      setIds(next);
      setEditing(next.length - 1);
      setPick("");
      const r2 = await setDayExercises(day.id, next);
      if (!r2.ok) return setErr(r2.error);
      router.refresh();
    });
  };
  const swap = (i: number, d: -1 | 1) => {
    const next = [...ids];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    commit(next);
  };

  return (
    <li className="min-w-0 rounded-xl border border-line bg-bg">
      <div className="flex items-center gap-1 p-2">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg px-2 text-left">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-panel2 text-[13px] font-semibold tabular-nums text-muted">{index + 1}</span>
          <span className="min-w-0">
            <span className="block truncate font-semibold">{name || day.name}</span>
            <span className="text-[13px] text-muted">{ids.length} exercises</span>
          </span>
          <IconChevronDown className={cx("ml-auto shrink-0 text-muted transition", open && "rotate-180")} />
        </button>
        <Arrows label={day.name} first={index === 0} last={index === total - 1} onMove={onMove} />
      </div>

      {open && (
        <div className="grid min-w-0 gap-3 border-t border-line p-3">
          <div className="flex items-center gap-2">
            <Input aria-label="Day name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className="font-semibold" />
            <ConfirmDelete
              label={`Delete ${day.name}`}
              className="min-h-11 min-w-11"
              onConfirm={async () => {
                const res = await deleteDay(day.id);
                if (!res.ok) return setErr(res.error);
                onDeleted();
              }}
            >
              <IconTrash width={18} height={18} />
            </ConfirmDelete>
          </div>
          {nameSave.state !== "idle" && <SaveBadge state={nameSave.state} error={nameSave.error} />}

          {ids.length ? (
            <ol className="grid min-w-0 gap-1.5">
              {ids.map((id, i) => {
                const e = byId.get(id);
                if (!e) return null;
                return (
                  <li key={`${id}-${i}`} className="min-w-0 rounded-lg border border-line bg-panel">
                    <div className="flex items-center gap-1 py-1 pl-3 pr-1">
                      <button type="button" onClick={() => setEditing(editing === i ? null : i)} aria-expanded={editing === i} className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left">
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11px] uppercase tracking-wide text-muted">{e.muscle}</span>
                          <span className="block truncate text-[15px]">{e.name}</span>
                        </span>
                        <span className="shrink-0 pr-1 text-[13px] tabular-nums text-muted">{fmtWeight(e.weight_lb, units)}</span>
                        <IconChevronDown className={cx("shrink-0 text-muted transition", editing === i && "rotate-180")} />
                      </button>
                      <Arrows label={e.name} first={i === 0} last={i === ids.length - 1} onMove={(d) => { setEditing(null); swap(i, d); }} />
                      <button type="button" aria-label={`Remove ${e.name} from ${day.name}`} onClick={() => { setEditing(null); commit(ids.filter((_, j) => j !== i)); }} className="grid h-11 w-9 place-items-center rounded-lg text-muted hover:text-loss">
                        <IconX width={18} height={18} />
                      </button>
                    </div>
                    {editing === i && (
                      <div className="border-t border-line p-3">
                        <ExerciseFields ex={e} units={units} preview={preview} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          ) : (
            <Empty title="No exercises on this day yet" />
          )}

          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
          >
            <Input aria-label={`Add an exercise to ${day.name}`} list={`ex-${day.id}`} value={pick} onChange={(e) => setPick(e.target.value)} maxLength={120} placeholder="Add an exercise (new or from your list)" />
            <datalist id={`ex-${day.id}`}>
              {exercises.map((e) => (
                <option key={e.id} value={e.name}>
                  {exerciseLabel(e)}
                </option>
              ))}
            </datalist>
            <Button type="submit" variant="subtle" disabled={!pick.trim() || pending || preview}>
              Add
            </Button>
          </form>
          {err && <p className="text-[13px] text-loss">{err}</p>}
        </div>
      )}
    </li>
  );
}

function Rotation({ days, exercises, units, preview }: { days: WorkoutDay[]; exercises: Exercise[]; units: Units; preview: boolean }) {
  const router = useRouter();
  const [order, setOrder] = useState(days);
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  useEffect(() => setOrder(days), [days]);
  const move = (i: number, d: -1 | 1) => {
    const next = [...order];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setOrder(next);
    if (!preview) start(async () => void (await reorder("lift_days", next.map((x) => x.id))));
  };
  return (
    <Card title="Rotation" action={<span className="text-[13px] text-muted">Runs top to bottom, then repeats</span>}>
      {order.length ? (
        <ol className="grid gap-2">
          {order.map((d, i) => (
            <DayCard
              key={d.id}
              day={d}
              index={i}
              total={order.length}
              exercises={exercises}
              units={units}
              preview={preview}
              onMove={(dir) => move(i, dir)}
              onDeleted={() => {
                setOrder((o) => o.filter((x) => x.id !== d.id));
                router.refresh();
              }}
            />
          ))}
        </ol>
      ) : (
        <Empty title="No workout days yet" />
      )}
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          start(async () => {
            const res = await saveDay({ name: name.trim() });
            if (res.ok) {
              setName("");
              router.refresh();
            }
          });
        }}
      >
        <Input aria-label="New day name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="New day, e.g. C Upper 1" />
        <Button type="submit" variant="subtle" disabled={pending || !name.trim() || preview}>
          Add day
        </Button>
      </form>
    </Card>
  );
}

// ---------- paste in a whole split ----------

const EXAMPLE = `Upper 1
Back - wide-grip lat pulldown - strap | 260 | 4-8
Upper Chest - incline chest press - belt
Side Delt - cable lateral raise

Lower 1
Quad - hack squat - belt, flat shoes | 390 | 4-6
Hamstring - leg curl`;

function ImportCard({ units, startOpen, preview }: { units: Units; startOpen: boolean; preview: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(startOpen);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const parsed = parseSplit(text);
  const count = parsed.reduce((t, d) => t + d.exercises.length, 0);
  return (
    <Card title="Paste in a split" action={<button type="button" onClick={() => setOpen((o) => !o)} className="text-[13px] text-accent">{open ? "Hide" : "Show"}</button>}>
      {open ? (
        <div className="grid gap-3">
          <ul className="grid gap-1 text-[13px] text-muted">
            <li>Day name on its own line, then one exercise per line. Leave a blank line between days.</li>
            <li>
              Exercise lines: <span className="text-ink">Muscle - Exercise - Equipment</span>. Only the exercise is required.
            </li>
            <li>
              Optional weight ({units}) and rep range after a bar: <span className="text-ink">| 260 | 4-8</span>
            </li>
          </ul>
          <Textarea aria-label="Your split" value={text} onChange={(e) => setText(e.target.value)} placeholder={EXAMPLE} className="min-h-56 font-mono text-[14px]" maxLength={20000} />
          {text.trim() && (
            <p className="text-[13px] text-muted">
              Found {parsed.length} {parsed.length === 1 ? "day" : "days"}: {parsed.map((d) => `${d.name} (${d.exercises.length})`).join(", ")}. {count} exercises total.
            </p>
          )}
          <Button
            disabled={pending || !parsed.length || preview}
            onClick={() =>
              start(async () => {
                const res = await importSplit(text);
                if (!res.ok) return setMsg({ ok: false, text: res.error });
                setMsg({ ok: true, text: `Added ${res.days} days and ${res.exercises} new exercises.` });
                setText("");
                router.refresh();
              })
            }
          >
            {pending ? "Importing…" : "Import"}
          </Button>
          {msg && <p className={cx("text-[13px]", msg.ok ? "text-win" : "text-loss")}>{msg.text}</p>}
        </div>
      ) : (
        <p className="text-[14px] text-muted">Have your split written down somewhere? Paste the whole thing in at once.</p>
      )}
    </Card>
  );
}

// ---------- exercise list ----------

/** Every detail of one exercise, saving on its own. Used in a day and in the exercise list. */
function ExerciseFields({ ex, units, onDelete, deleteLabel, preview }: { ex: Exercise; units: Units; onDelete?: () => Promise<void>; deleteLabel?: string; preview: boolean }) {
  const [v, setV] = useState({ muscle: ex.muscle, name: ex.name, equipment: ex.equipment, sets: ex.sets, reps: ex.reps, weight_lb: ex.weight_lb, note: ex.note, alternative: ex.alternative });
  const save = useAutosave({ id: ex.id, ...v, name: v.name.trim() || ex.name }, saveExercise, { enabled: !preview });
  return (
    <div className="grid min-w-0 gap-2">
      <label className="grid min-w-0 gap-1 text-[12px] text-muted">
        Exercise
        <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} maxLength={120} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="grid min-w-0 gap-1 text-[12px] text-muted">
          Muscle
          <Input value={v.muscle} onChange={(e) => setV({ ...v, muscle: e.target.value })} maxLength={60} placeholder="e.g. Back" />
        </label>
        <label className="grid min-w-0 gap-1 text-[12px] text-muted">
          Equipment
          <Input value={v.equipment} onChange={(e) => setV({ ...v, equipment: e.target.value })} maxLength={120} placeholder="e.g. strap, belt" />
        </label>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <label className="grid min-w-0 gap-1 text-[12px] text-muted">
          Weight ({units})
          <NumField label={`${v.name} weight in ${units}`} value={toUnit(v.weight_lb, units)} onChange={(n) => setV({ ...v, weight_lb: fromUnit(n, units) })} placeholder="0" />
        </label>
        <label className="grid min-w-0 gap-1 text-[12px] text-muted">
          Rep range
          <Input value={v.reps} onChange={(e) => setV({ ...v, reps: e.target.value })} maxLength={20} placeholder="4-8" className="text-center" />
        </label>
        <label className="grid min-w-0 gap-1 text-[12px] text-muted">
          Sets
          <NumField label="Working sets" decimals={false} value={v.sets} onChange={(n) => setV({ ...v, sets: Math.min(20, Math.max(1, n ?? 1)) })} />
        </label>
      </div>
      <label className="grid min-w-0 gap-1 text-[12px] text-muted">
        Notes
        <Textarea value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} maxLength={500} className="min-h-16" placeholder="Form cues, setup" />
      </label>
      <label className="grid min-w-0 gap-1 text-[12px] text-muted">
        Alternative
        <Input value={v.alternative} onChange={(e) => setV({ ...v, alternative: e.target.value })} maxLength={200} placeholder="If the machine is taken" />
      </label>
      <div className="flex items-center justify-between gap-2">
        {save.state !== "idle" ? <SaveBadge state={save.state} error={save.error} /> : <span className="text-[12px] text-muted">Saves on its own. Updates every day that uses it.</span>}
        {onDelete && !preview && (
          <ConfirmDelete label={deleteLabel ?? "Delete"} onConfirm={onDelete} className="min-h-11 border border-loss/40 px-3">
            {deleteLabel ?? "Delete"}
          </ConfirmDelete>
        )}
      </div>
    </div>
  );
}

function ExerciseRow({ ex, units, onDelete, preview }: { ex: Exercise; units: Units; onDelete: () => Promise<void>; preview: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-xl border border-line bg-bg">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-h-14 w-full items-center gap-2 rounded-xl px-4 text-left">
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] uppercase tracking-wide text-muted">{ex.muscle || "No muscle"}</span>
          <span className="block truncate font-semibold">{ex.name}</span>
        </span>
        <span className="shrink-0 text-[13px] tabular-nums text-muted">{fmtWeight(ex.weight_lb, units)}</span>
        <IconChevronDown className={cx("shrink-0 text-muted transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t border-line p-3">
          <ExerciseFields ex={ex} units={units} preview={preview} onDelete={onDelete} deleteLabel="Delete from every day" />
        </div>
      )}
    </li>
  );
}

function ExerciseList({ exercises, units, preview }: { exercises: Exercise[]; units: Units; preview: boolean }) {
  const router = useRouter();
  const [list, setList] = useState(exercises);
  const [err, setErr] = useState("");
  useEffect(() => setList(exercises), [exercises]);
  return (
    <Card title="Exercise list" action={<span className="text-[13px] text-muted">Every exercise in your split</span>}>
      {list.length ? (
        <ul className="grid gap-2">
          {list.map((e) => (
            <ExerciseRow
              key={e.id}
              ex={e}
              units={units}
              preview={preview}
              onDelete={async () => {
                const res = await deleteExercise(e.id);
                if (!res.ok) return setErr(res.error);
                setList((l) => l.filter((x) => x.id !== e.id));
                router.refresh();
              }}
            />
          ))}
        </ul>
      ) : (
        <Empty title="No exercises yet">Add them to a day on the Days tab.</Empty>
      )}
      <p className="mt-3 text-[13px] text-muted">To add an exercise, add it to a day. An exercise that&apos;s on no day is removed.</p>
      {err && <p className="mt-2 text-[13px] text-loss">{err}</p>}
    </Card>
  );
}

export function SplitEditor({ days, exercises, units, preview = false }: { days: WorkoutDay[]; exercises: Exercise[]; units: Units; preview?: boolean }) {
  const [tab, setTab] = useState<Tab>("days");
  return (
    <div className="grid gap-4">
      <PageHeader title="The split" sub="Changes save on their own and show up in your next workout." />
      <div role="tablist" aria-label="Split" className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-panel p-1">
        {(
          [
            ["days", `Days (${days.length})`],
            ["list", `Exercise list (${exercises.length})`],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cx("min-h-11 rounded-lg text-[14px]", tab === k ? "bg-accent font-semibold text-accent-ink" : "text-muted hover:text-ink")}>
            {label}
          </button>
        ))}
      </div>
      {tab === "days" ? (
        <>
          <Rotation days={days} exercises={exercises} units={units} preview={preview} />
          <ImportCard units={units} startOpen={!days.length} preview={preview} />
        </>
      ) : (
        <ExerciseList exercises={exercises} units={units} preview={preview} />
      )}
    </div>
  );
}
