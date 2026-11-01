"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { deleteExercise, reorder, saveExercise } from "@/app/actions/lift";
import { DAYS, DAY_LABEL, type Day, type Exercise, type Units } from "@/lib/types";
import { fromUnit, toUnit } from "@/lib/units";
import { IconDown, IconTrash, IconUp } from "./icons";
import { NumField } from "./num-field";
import { SaveBadge, useAutosave } from "./use-autosave";
import { Button, Card, Empty, Input, PageHeader, cx } from "./ui";

function Row({ ex, units, first, last, onMove, onDelete, preview }: { ex: Exercise; units: Units; first: boolean; last: boolean; onMove: (dir: -1 | 1) => void; onDelete: () => void; preview: boolean }) {
  const [v, setV] = useState({ name: ex.name, sets: ex.sets, reps: ex.reps, weight_lb: ex.weight_lb, note: ex.note });
  const save = useAutosave({ id: ex.id, day: ex.day, ...v, name: v.name.trim() || ex.name }, saveExercise, { enabled: !preview });
  return (
    <li className="grid gap-2 rounded-xl border border-line bg-bg p-3">
      <div className="flex items-center gap-2">
        <Input aria-label="Exercise name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} maxLength={80} className="font-semibold" />
        <div className="flex shrink-0">
          <button type="button" aria-label={`Move ${v.name} up`} disabled={first} onClick={() => onMove(-1)} className="grid h-11 w-9 place-items-center rounded-lg text-muted hover:text-ink disabled:opacity-30">
            <IconUp width={18} height={18} />
          </button>
          <button type="button" aria-label={`Move ${v.name} down`} disabled={last} onClick={() => onMove(1)} className="grid h-11 w-9 place-items-center rounded-lg text-muted hover:text-ink disabled:opacity-30">
            <IconDown width={18} height={18} />
          </button>
          <button type="button" aria-label={`Delete ${v.name}`} onClick={onDelete} className="grid h-11 w-9 place-items-center rounded-lg text-muted hover:text-loss">
            <IconTrash width={18} height={18} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <label className="grid gap-1 text-[12px] text-muted">
          Sets
          <NumField label="Sets" decimals={false} value={v.sets} onChange={(n) => setV({ ...v, sets: Math.min(20, Math.max(1, n ?? 1)) })} />
        </label>
        <label className="grid gap-1 text-[12px] text-muted">
          Reps
          <Input aria-label="Reps" value={v.reps} onChange={(e) => setV({ ...v, reps: e.target.value })} maxLength={20} placeholder="8-10" className="text-center" />
        </label>
        <label className="grid gap-1 text-[12px] text-muted">
          Next weight ({units})
          <NumField label={`Next weight in ${units}`} value={toUnit(v.weight_lb, units)} onChange={(n) => setV({ ...v, weight_lb: fromUnit(n, units) })} placeholder="0" />
        </label>
      </div>
      <Input aria-label="Note" value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} maxLength={300} placeholder="Note (optional): tempo, setup, cues" className="text-[14px]" />
      {save.state !== "idle" && <SaveBadge state={save.state} error={save.error} />}
    </li>
  );
}

function DayCard({ day, list, units, preview }: { day: Day; list: Exercise[]; units: Units; preview: boolean }) {
  const router = useRouter();
  const [order, setOrder] = useState(list);
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  useEffect(() => setOrder(list), [list]);

  const move = (i: number, dir: -1 | 1) => {
    const next = [...order];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    setOrder(next);
    if (!preview) start(async () => void (await reorder("lift_exercises", next.map((e) => e.id))));
  };

  return (
    <Card title={`${DAY_LABEL[day]} day`} action={<span className="text-[13px] text-muted">{order.length} exercises</span>}>
      {order.length ? (
        <ul className="grid gap-2">
          {order.map((e, i) => (
            <Row
              key={e.id}
              ex={e}
              units={units}
              first={i === 0}
              last={i === order.length - 1}
              preview={preview}
              onMove={(d) => move(i, d)}
              onDelete={() =>
                start(async () => {
                  if (!confirm(`Remove ${e.name} from your split? Past workouts keep it.`)) return;
                  const res = await deleteExercise(e.id);
                  if (!res.ok) return setErr(res.error);
                  setOrder((o) => o.filter((x) => x.id !== e.id));
                  router.refresh();
                })
              }
            />
          ))}
        </ul>
      ) : (
        <Empty title={`No ${DAY_LABEL[day]} exercises yet`} />
      )}
      <form
        className={cx("flex gap-2", order.length ? "mt-3" : "mt-3")}
        onSubmit={(e) => {
          e.preventDefault();
          const n = name.trim();
          if (!n) return;
          start(async () => {
            setErr("");
            const res = await saveExercise({ day, name: n, sets: 3, reps: "8-10", weight_lb: null, note: "" });
            if (!res.ok) return setErr(res.error);
            setName("");
            router.refresh();
          });
        }}
      >
        <Input aria-label={`New ${DAY_LABEL[day]} exercise`} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={`Add a ${DAY_LABEL[day]} exercise`} />
        <Button type="submit" variant="subtle" disabled={pending || !name.trim() || preview}>
          Add
        </Button>
      </form>
      {err && <p className="mt-2 text-[13px] text-loss">{err}</p>}
    </Card>
  );
}

export function SplitEditor({ exercises, units, preview = false }: { exercises: Exercise[]; units: Units; preview?: boolean }) {
  return (
    <div className="grid gap-4">
      <PageHeader title="The split" sub="Upper / Lower, repeat forever. Changes save on their own and show up in your next workout." />
      <div className="grid gap-4 lg:grid-cols-2">
        {DAYS.map((d) => (
          <DayCard key={d} day={d} units={units} preview={preview} list={exercises.filter((e) => e.day === d).sort((a, b) => a.position - b.position)} />
        ))}
      </div>
    </div>
  );
}
