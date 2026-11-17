"use client";
import type { ReactNode } from "react";
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IconGrip } from "./icons";
import { cx } from "./ui";

/** Returns a copy of `list` with the item at `from` moved to `to`. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const n = list.slice();
  const [x] = n.splice(from, 1);
  n.splice(to, 0, x);
  return n;
}

function Row({ id, label, className, disabled, children }: { id: string; label: string; className?: string; disabled: boolean; children: (grip: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const grip = disabled ? null : (
    <button
      type="button"
      aria-label={`Drag ${label}`}
      title="Hold and drag"
      {...attributes}
      {...listeners}
      className="grid h-10 w-8 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-muted hover:text-ink active:cursor-grabbing"
    >
      <IconGrip width={18} height={18} />
    </button>
  );
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, position: "relative", zIndex: isDragging ? 10 : undefined }} className={cx(className, isDragging && "opacity-90 shadow-2xl")}>
      {children(grip)}
    </li>
  );
}

/**
 * A list you put in order by holding the grip (⠿) on a row and dragging it.
 * Works with a mouse, touch (press and hold) and the keyboard (focus the grip, Space, arrow keys, Space).
 * `onMove(from, to)` runs once when the row is dropped; the caller saves it.
 */
export function Sortable<T>({
  items,
  keyOf,
  onMove,
  render,
  className,
  itemClassName,
  label = "item",
  disabled = false,
}: {
  items: T[];
  keyOf: (item: T) => string;
  onMove: (from: number, to: number) => void;
  /** Row content; put `grip` (the drag handle) where it should go. */
  render: (item: T, grip: ReactNode, index: number) => ReactNode;
  className?: string;
  itemClassName?: string;
  label?: string;
  disabled?: boolean;
  /** Kept for older callers; the grip is the same either way. */
  stacked?: boolean;
}) {
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
        if (from >= 0 && to >= 0) onMove(from, to);
      }}
    >
      <SortableContext items={keys} strategy={verticalListSortingStrategy}>
        <ol className={cx("grid min-w-0 gap-1.5", className)}>
          {items.map((it, i) => (
            <Row key={keys[i]} id={keys[i]} label={label} className={itemClassName} disabled={disabled}>
              {(grip) => render(it, grip, i)}
            </Row>
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}
