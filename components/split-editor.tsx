"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { addToDay, deleteDay, deleteExercise, importSplit, reorder, replaceSplit, saveDay, saveExercise, setDayExercises } from "@/app/actions/lift";
import { parseSplit, splitToText } from "@/lib/import";
import type { Exercise, Units, WorkoutDay } from "@/lib/types";
import { exerciseLabel } from "@/lib/types";
import { fmtWeight, fromUnit, toUnit } from "@/lib/units";
import { IconChevronDown, IconGrip, IconTrash, IconX } from "./icons";
import { ConfirmDelete } from "./confirm-delete";
import { NumField } from "./num-field";
import { SaveBadge, useAutosave } from "./use-autosave";
import { Button, Card, Empty, Input, PageHeader, Textarea, cx } from "./ui";

type Tab = "days" | "list" | "text";

// ---------- drag to reorder ----------

/** Grip to hold and drag. Works with mouse, touch (press and hold) and keyboard. */
function Grip({ label, listeners, attributes }: { label: string; listeners?: Record<string, unknown>; attributes?: Record<string, unknown> }) {
  return (
    <button
      type="button"
      aria-label={`Drag ${label}`}
      title="Hold and drag"
      {...attributes}
      {...listeners}
      className="grid h-11 w-8 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-muted hover:text-ink active:cursor-grabbing"
    >
      <IconGrip width={18} height={18} />
    </button>
  );
}

/** A vertical list you reorder by dragging each item's grip. */
function SortableList<T>({ items, keyOf, onReorder, render, className }: { items: T[]; keyOf: (t: T, i: number) => string; onReorder: (from: number, to: number) => void; render: (t: T, i: number, grip: React.ReactNode, dragging: boolean) => React.ReactNode; className?: string }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const keys = items.map(keyOf);
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={({ active, over }) => {
        if (!over || active.id === over.id) return;
        const from = keys.indexOf(String(active.id));
        const to = keys.indexOf(String(over.id));
        if (from >= 0 && to >= 0) onReorder(from, to);
      }}
    >
      <SortableContext items={keys} strategy={verticalListSortingStrategy}>
        <ol className={className}>
          {items.map((t, i) => (
            <SortableItem key={keys[i]} id={keys[i]} label={String(keys[i])}>
              {(grip, dragging) => render(t, i, grip, dragging)}
            </SortableItem>
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({ id, label, children }: { id: string; label: string; children: (grip: React.ReactNode, dragging: boolean) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined, position: "relative" }} className={cx("min-w-0", isDragging && "opacity-90 shadow-2xl")}>
      {children(<Grip label={label} listeners={listeners as Record<string, unknown>} attributes={attributes as unknown as Record<string, unknown>} />, isDragging)}
    </li>
  );
}

// ---------- one day in the rotation ----------

function DayCard({ day, index, grip, exercises, units, onDeleted, preview }: { day: WorkoutDay; index: number; grip: React.ReactNode; exercises: Exercise[]; units: Units; onDeleted: () => void; preview: boolean }) {
  const router = useRouter();
  const [name, setName] = useState(day.name);
  const [ids, setIds] = useState(day.exerciseIds);
  const [pick, setPick] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const byName = new Map(exercises.map((e) => [e.name.trim().toLowerCase(), e.id]));
  const nameSave = useAutosave({ id: day.id, name: name.trim() || day.name }, saveDay, { enabled: !preview });
  useEffect(() => setIds(day.exerciseIds), [day.exerciseIds]);

  const commit = (next: string[], refresh = false) => {
    setIds(next);
    if (!preview)
      start(async () => {
        const res = await setDayExercises(day.id, next);
        setErr(res.ok ? "" : res.error);
        // Something taken off its last day leaves the exercise list, so reload it.
        if (res.ok && refresh) router.refresh();
      });
  };
  const add = () => {
    const n = pick.trim();
    if (!n) return;
    const existing = byName.get(n.toLowerCase());
    if (existing) {
      commit([...ids, existing]);
      setPick("");
      return;
    }
    start(async () => {
      setErr("");
      // One server step: make the exercise and put it on this day together.
      const res = await addToDay(day.id, n);
      if (!res.ok || !res.id) return setErr(res.ok ? "Couldn't add it." : res.error);
      const next = [...ids, res.id];
      setIds(next);
      setEditing(`${res.id}-${next.length - 1}`);
      setPick("");
      router.refresh();
    });
  };

  return (
    <div className="grid min-w-0 gap-2 rounded-2xl border border-line bg-panel p-3">
      <div className="flex items-center gap-1">
        {grip}
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-panel2 text-[13px] font-semibold tabular-nums text-muted">{index + 1}</span>
        <Input aria-label="Day name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className="ml-1 min-w-0 flex-1 border-transparent bg-transparent px-2 font-semibold focus:bg-bg" />
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
      {nameSave.state !== "idle" && nameSave.state !== "saved" && <SaveBadge state={nameSave.state} error={nameSave.error} />}

      {ids.length ? (
        <SortableList
          className="grid min-w-0 gap-1.5"
          items={ids}
          keyOf={(id, i) => `${id}-${i}`}
          onReorder={(from, to) => {
            setEditing(null);
            commit(arrayMove(ids, from, to));
          }}
          render={(id, i, g) => {
            const e = byId.get(id);
            if (!e) return null;
            const key = `${id}-${i}`;
            const open = editing === key;
            return (
              <div className="min-w-0 rounded-xl border border-line bg-bg">
                <div className="flex items-center gap-0.5 py-0.5 pr-1">
                  {g}
                  <button data-guest-ok type="button" onClick={() => setEditing(open ? null : key)} aria-expanded={open} className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left">
                    <span className="min-w-0 flex-1">
                      {e.muscle && <span className="block text-[11px] uppercase tracking-wide text-muted">{e.muscle}</span>}
                      <span className="block truncate text-[15px]">{e.name}</span>
                    </span>
                    <span className="shrink-0 text-right text-[13px] tabular-nums text-muted">
                      {fmtWeight(e.weight_lb, units)}
                      <span className="block text-[11px]">{e.reps}</span>
                    </span>
                    <IconChevronDown className={cx("shrink-0 text-muted transition", open && "rotate-180")} />
                  </button>
                  <ConfirmDelete label={`Remove ${e.name} from ${day.name}`} confirmText="Remove?" className="min-h-11 min-w-9" onConfirm={() => { setEditing(null); commit(ids.filter((_, j) => j !== i), true); }}>
                    <IconX width={18} height={18} />
                  </ConfirmDelete>
                </div>
                {open && (
                  <div className="border-t border-line p-3">
                    <ExerciseFields ex={e} units={units} preview={preview} />
                  </div>
                )}
              </div>
            );
          }}
        />
      ) : (
        <p className="px-1 py-2 text-[14px] text-muted">No exercises on this day yet.</p>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <Input aria-label={`Add an exercise to ${day.name}`} list={`ex-${day.id}`} value={pick} onChange={(e) => setPick(e.target.value)} maxLength={120} placeholder="Add an exercise" />
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
  );
}

function Rotation({ days, exercises, units, preview }: { days: WorkoutDay[]; exercises: Exercise[]; units: Units; preview: boolean }) {
  const router = useRouter();
  const [order, setOrder] = useState(days);
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  useEffect(() => setOrder(days), [days]);
  return (
    <div className="grid gap-3">
      <p className="text-[13px] text-muted">Runs top to bottom, then repeats. Hold a grip to drag. Tap an exercise to edit it.</p>
      {order.length ? (
        <SortableList
          className="grid min-w-0 gap-3 lg:grid-cols-2"
          items={order}
          keyOf={(d) => d.id}
          onReorder={(from, to) => {
            const next = arrayMove(order, from, to);
            setOrder(next);
            if (!preview) start(async () => void (await reorder("lift_days", next.map((x) => x.id))));
          }}
          render={(d, i, g) => (
            <DayCard
              day={d}
              index={i}
              grip={g}
              exercises={exercises}
              units={units}
              preview={preview}
              onDeleted={() => {
                setOrder((o) => o.filter((x) => x.id !== d.id));
                router.refresh();
              }}
            />
          )}
        />
      ) : (
        <Empty title="No workout days yet">Add one below, or use Edit as text to type in your whole split.</Empty>
      )}
      <form
        className="flex gap-2"
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
    </div>
  );
}

// ---------- the whole split as text ----------

function TextEditor({ days, exercises, units, preview, onDone }: { days: WorkoutDay[]; exercises: Exercise[]; units: Units; preview: boolean; onDone: () => void }) {
  const router = useRouter();
  const start0 = splitToText(days, exercises.map((e) => ({ ...e, weight: toUnit(e.weight_lb, units) })));
  const [text, setText] = useState(start0);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const parsed = parseSplit(text);
  const count = parsed.reduce((t, d) => t + d.exercises.length, 0);
  return (
    <Card title="Edit as text">
      <ul className="mb-3 grid gap-1 text-[13px] text-muted">
        <li>Day name on its own line, then one exercise per line. Blank line between days. Order here is the rotation order.</li>
        <li>
          Exercise lines: <span className="text-ink">Muscle - Exercise - Equipment | weight ({units}) | reps</span>. Use <span className="text-ink">-</span> for no weight.
        </li>
        <li>Notes and alternatives stay with each exercise as long as its name stays the same.</li>
      </ul>
      <Textarea aria-label="Your split as text" value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} maxLength={30000} className="min-h-[60vh] font-mono text-[13px] leading-relaxed" />
      <p className="mt-2 text-[13px] text-muted">
        {parsed.length} {parsed.length === 1 ? "day" : "days"}, {count} exercises
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          disabled={pending || preview || text === start0}
          onClick={() =>
            start(async () => {
              const res = await replaceSplit(text);
              if (!res.ok) return setMsg({ ok: false, text: res.error });
              setMsg({ ok: true, text: "Split updated." });
              router.refresh();
              onDone();
            })
          }
        >
          {pending ? "Updating…" : "Update split"}
        </Button>
        {text !== start0 && (
          <button type="button" onClick={() => setText(start0)} className="min-h-11 px-2 text-[14px] text-muted hover:text-ink">
            Undo changes
          </button>
        )}
        {msg && <span className={cx("text-[13px]", msg.ok ? "text-win" : "text-loss")}>{msg.text}</span>}
      </div>
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
      <button data-guest-ok type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-h-14 w-full items-center gap-2 rounded-xl px-4 text-left">
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
      <div data-guest-ok role="tablist" aria-label="Split" className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-panel p-1">
        {(
          [
            ["days", `Days (${days.length})`],
            ["list", `Exercises (${exercises.length})`],
            ["text", "Edit as text"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cx("min-h-11 rounded-lg text-[13px] sm:text-[14px]", tab === k ? "bg-accent font-semibold text-accent-ink" : "text-muted hover:text-ink")}>
            {label}
          </button>
        ))}
      </div>
      {tab === "days" && (
        <>
          <Rotation days={days} exercises={exercises} units={units} preview={preview} />
          {!days.length && <ImportCard units={units} startOpen preview={preview} />}
        </>
      )}
      {tab === "list" && <ExerciseList exercises={exercises} units={units} preview={preview} />}
      {tab === "text" && <TextEditor days={days} exercises={exercises} units={units} preview={preview} onDone={() => setTab("days")} />}
    </div>
  );
}
