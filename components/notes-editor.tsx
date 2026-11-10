"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { deleteChecklistItem, deleteNote, reorder, saveChecklistItem, saveNote } from "@/app/actions/lift";
import { KIND_LABEL, type ChecklistItem, type ChecklistKind, type Note } from "@/lib/types";
import { ConfirmDelete } from "./confirm-delete";
import { IconDown, IconTrash, IconUp } from "./icons";
import { SaveBadge, useAutosave } from "./use-autosave";
import { Button, Card, Empty, Input, PageHeader, Textarea, buttonClass } from "./ui";

const KINDS: ChecklistKind[] = ["pre", "post", "refuel"];

function Mover({ label, first, last, onMove, onDelete }: { label: string; first: boolean; last: boolean; onMove: (d: -1 | 1) => void; onDelete: () => void | Promise<void> }) {
  return (
    <div className="flex shrink-0">
      <button type="button" aria-label={`Move ${label} up`} disabled={first} onClick={() => onMove(-1)} className="grid h-11 w-9 place-items-center rounded-lg text-muted hover:text-ink disabled:opacity-30">
        <IconUp width={18} height={18} />
      </button>
      <button type="button" aria-label={`Move ${label} down`} disabled={last} onClick={() => onMove(1)} className="grid h-11 w-9 place-items-center rounded-lg text-muted hover:text-ink disabled:opacity-30">
        <IconDown width={18} height={18} />
      </button>
      <ConfirmDelete label={`Delete ${label}`} onConfirm={onDelete} className="min-h-11 min-w-9">
        <IconTrash width={18} height={18} />
      </ConfirmDelete>
    </div>
  );
}

function useOrdered<T extends { id: string }>(list: T[]) {
  const [order, setOrder] = useState(list);
  useEffect(() => setOrder(list), [list]);
  const swap = (i: number, d: -1 | 1) => {
    const next = [...order];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setOrder(next);
    return next;
  };
  return [order, setOrder, swap] as const;
}

function NoteRow({ note, first, last, onMove, onDelete }: { note: Note; first: boolean; last: boolean; onMove: (d: -1 | 1) => void; onDelete: () => void }) {
  const [v, setV] = useState({ title: note.title, body: note.body });
  const save = useAutosave({ id: note.id, title: v.title.trim() || note.title, body: v.body }, saveNote);
  return (
    <li className="grid gap-2 rounded-xl border border-line bg-bg p-3">
      <div className="flex items-center gap-2">
        <Input aria-label="Section title" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} maxLength={80} className="font-semibold" />
        <Mover label={v.title} first={first} last={last} onMove={onMove} onDelete={onDelete} />
      </div>
      <Textarea aria-label={`${v.title} text`} value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} maxLength={5000} className="min-h-32" />
      {save.state !== "idle" && <SaveBadge state={save.state} error={save.error} />}
    </li>
  );
}

function ItemRow({ item, first, last, onMove, onDelete }: { item: ChecklistItem; first: boolean; last: boolean; onMove: (d: -1 | 1) => void; onDelete: () => void }) {
  const [body, setBody] = useState(item.body);
  const save = useAutosave({ id: item.id, kind: item.kind, body: body.trim() || item.body }, saveChecklistItem);
  return (
    <li className="flex items-center gap-2">
      <Input aria-label="Checklist item" value={body} onChange={(e) => setBody(e.target.value)} maxLength={200} className={save.state === "error" ? "border-loss" : undefined} />
      <Mover label={body} first={first} last={last} onMove={onMove} onDelete={onDelete} />
    </li>
  );
}

function ChecklistCard({ kind, items, editing }: { kind: ChecklistKind; items: ChecklistItem[]; editing: boolean }) {
  const router = useRouter();
  const [order, setOrder, swap] = useOrdered(items);
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  return (
    <Card title={KIND_LABEL[kind]}>
      {editing ? (
        <>
          <ul className="grid gap-2">
            {order.map((it, i) => (
              <ItemRow
                key={it.id}
                item={it}
                first={i === 0}
                last={i === order.length - 1}
                onMove={(d) => start(async () => void (await reorder("lift_checklist_items", swap(i, d).map((x) => x.id))))}
                onDelete={() =>
                  start(async () => {
                    const res = await deleteChecklistItem(it.id);
                    if (res.ok) setOrder((o) => o.filter((x) => x.id !== it.id));
                  })
                }
              />
            ))}
          </ul>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!text.trim()) return;
              start(async () => {
                const res = await saveChecklistItem({ kind, body: text.trim() });
                if (res.ok) {
                  setText("");
                  router.refresh();
                }
              });
            }}
          >
            <Input aria-label={`New ${KIND_LABEL[kind]} item`} value={text} onChange={(e) => setText(e.target.value)} maxLength={200} placeholder="Add an item" />
            <Button type="submit" variant="subtle" disabled={pending || !text.trim()}>
              Add
            </Button>
          </form>
        </>
      ) : order.length ? (
        <ol className="grid gap-2">
          {order.map((it, i) => (
            <li key={it.id} className="flex gap-3 text-[15px]">
              <span className="w-5 shrink-0 text-right tabular-nums text-muted">{i + 1}.</span>
              <span>{it.body}</span>
            </li>
          ))}
        </ol>
      ) : (
        <Empty title="Nothing here yet">Tap Edit to add items.</Empty>
      )}
    </Card>
  );
}

export function NotesEditor({ notes, checklist, preview = false }: { notes: Note[]; checklist: ChecklistItem[]; preview?: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [order, setOrder, swap] = useOrdered(notes);
  const [pending, start] = useTransition();

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Key notes"
        sub="Equipment, how the split and sets work, and your checklists."
        action={
          <button type="button" onClick={() => setEditing((e) => !e)} disabled={preview} className={buttonClass(editing ? "primary" : "ghost")}>
            {editing ? "Done" : "Edit"}
          </button>
        }
      />

      {editing ? (
        <Card title="Sections">
          <ul className="grid gap-3">
            {order.map((n, i) => (
              <NoteRow
                key={n.id}
                note={n}
                first={i === 0}
                last={i === order.length - 1}
                onMove={(d) => start(async () => void (await reorder("lift_notes", swap(i, d).map((x) => x.id))))}
                onDelete={() =>
                  start(async () => {
                    const res = await deleteNote(n.id);
                    if (res.ok) setOrder((o) => o.filter((x) => x.id !== n.id));
                  })
                }
              />
            ))}
          </ul>
          <Button
            variant="subtle"
            className="mt-3"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await saveNote({ title: "New section", body: "" });
                if (res.ok) router.refresh();
              })
            }
          >
            Add section
          </Button>
        </Card>
      ) : order.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {order.map((n) => (
            <Card key={n.id} title={n.title}>
              {n.body.trim() ? <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{n.body}</p> : <p className="text-[14px] text-muted">Empty. Tap Edit to fill it in.</p>}
            </Card>
          ))}
        </div>
      ) : (
        <Empty title="No key notes yet">Tap Edit to add a section.</Empty>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {KINDS.map((k) => (
          <ChecklistCard key={k} kind={k} editing={editing} items={checklist.filter((c) => c.kind === k).sort((a, b) => a.position - b.position)} />
        ))}
      </div>
    </div>
  );
}
