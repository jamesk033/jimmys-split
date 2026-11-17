"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { deleteChecklistItem, deleteNote, reorder, saveChecklistItem, saveNote } from "@/app/actions/lift";
import { KIND_LABEL, type ChecklistItem, type ChecklistKind, type Note } from "@/lib/types";
import { ConfirmDelete } from "./confirm-delete";
import { titleCase } from "@/lib/title-case";
import { IconTrash } from "./icons";
import { Sortable, moveItem } from "./reorder";
import { SaveBadge, useAutosave } from "./use-autosave";
import { Button, Card, Empty, Input, PageHeader, Textarea, buttonClass } from "./ui";

const KINDS: ChecklistKind[] = ["pre", "post", "refuel"];

function Remove({ label, onDelete }: { label: string; onDelete: () => void | Promise<void> }) {
  return (
    <ConfirmDelete label={`Delete ${label}`} onConfirm={onDelete} className="min-h-11 min-w-9 shrink-0">
      <IconTrash width={18} height={18} />
    </ConfirmDelete>
  );
}

function useOrdered<T extends { id: string }>(list: T[]) {
  const [order, setOrder] = useState(list);
  useEffect(() => setOrder(list), [list]);
  const move = (from: number, to: number) => {
    const next = moveItem(order, from, to);
    setOrder(next);
    return next;
  };
  return [order, setOrder, move] as const;
}

function NoteRow({ note, grip, onDelete }: { note: Note; grip: React.ReactNode; onDelete: () => void }) {
  const [v, setV] = useState({ title: note.title, body: note.body });
  const save = useAutosave({ id: note.id, title: v.title.trim() || note.title, body: v.body }, saveNote);
  return (
    <div className="grid min-w-0 flex-1 gap-2">
      <div className="flex items-center gap-2">
        {grip}
        <Input aria-label="Section title" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} maxLength={80} className="font-semibold" />
        <Remove label={v.title} onDelete={onDelete} />
      </div>
      <Textarea aria-label={`${v.title} text`} value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} maxLength={5000} className="min-h-32" />
      {save.state !== "idle" && <SaveBadge state={save.state} error={save.error} />}
    </div>
  );
}

function ItemRow({ item, grip, onDelete }: { item: ChecklistItem; grip: React.ReactNode; onDelete: () => void }) {
  const [body, setBody] = useState(item.body);
  const save = useAutosave({ id: item.id, kind: item.kind, body: body.trim() || item.body }, saveChecklistItem);
  return (
    <>
      {grip}
      <Input aria-label="Checklist item" value={body} onChange={(e) => setBody(e.target.value)} maxLength={200} className={save.state === "error" ? "border-loss" : undefined} />
      <Remove label={body} onDelete={onDelete} />
    </>
  );
}

function ChecklistCard({ kind, items, editing }: { kind: ChecklistKind; items: ChecklistItem[]; editing: boolean }) {
  const router = useRouter();
  const [order, setOrder, move] = useOrdered(items);
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  return (
    <Card title={KIND_LABEL[kind]}>
      {editing ? (
        <>
          <Sortable
            items={order}
            keyOf={(it) => it.id}
            label="item"
            className="gap-2"
            itemClassName="flex items-center gap-1"
            onMove={(from, to) => start(async () => void (await reorder("lift_checklist_items", move(from, to).map((x) => x.id))))}
            render={(it, grip) => (
              <ItemRow
                item={it}
                grip={grip}
                onDelete={() =>
                  start(async () => {
                    const res = await deleteChecklistItem(it.id);
                    if (res.ok) setOrder((o) => o.filter((x) => x.id !== it.id));
                  })
                }
              />
            )}
          />
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
              <span>{titleCase(it.body)}</span>
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
  const [order, setOrder, move] = useOrdered(notes);
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
          <Sortable
            items={order}
            keyOf={(n) => n.id}
            label="section"
            className="gap-3"
            itemClassName="flex rounded-xl border border-line bg-bg p-3"
            onMove={(from, to) => start(async () => void (await reorder("lift_notes", move(from, to).map((x) => x.id))))}
            render={(n, grip) => (
              <NoteRow
                note={n}
                grip={grip}
                onDelete={() =>
                  start(async () => {
                    const res = await deleteNote(n.id);
                    if (res.ok) setOrder((o) => o.filter((x) => x.id !== n.id));
                  })
                }
              />
            )}
          />
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
            <Card key={n.id} title={titleCase(n.title)}>
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
