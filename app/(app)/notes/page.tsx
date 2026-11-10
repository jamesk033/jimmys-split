import type { Metadata } from "next";
import { NotesEditor } from "@/components/notes-editor";
import { getChecklist, getContext, getNotes } from "@/lib/data";

export const metadata: Metadata = { title: "Key notes" };

export default async function NotesPage() {
  const ctx = await getContext();
  const [notes, checklist] = await Promise.all([getNotes(ctx), getChecklist(ctx)]);
  return <NotesEditor notes={notes} checklist={checklist} preview={ctx.guest} />;
}
