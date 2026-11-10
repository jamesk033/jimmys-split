"use client";
import { useEffect, useRef, useState } from "react";
import { IconTrash } from "./icons";
import { cx } from "./ui";

/**
 * Delete button that asks first: the first tap turns it into a red "Delete?" button,
 * the second tap deletes. It goes back to normal after a few seconds.
 * Used for every delete on the site so nothing goes with one stray tap.
 */
export function ConfirmDelete({
  onConfirm,
  label = "Delete",
  className,
  children,
  confirmText = "Delete?",
}: {
  onConfirm: () => void | Promise<void>;
  label?: string;
  className?: string;
  /** What the button shows before it's armed. Defaults to a trash icon. */
  children?: React.ReactNode;
  confirmText?: string;
}) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  return (
    <button
      type="button"
      disabled={busy}
      aria-label={armed ? `Confirm: ${label}` : label}
      title={armed ? "Tap again to delete" : label}
      onClick={async () => {
        if (!armed) {
          setArmed(true);
          timer.current = setTimeout(() => setArmed(false), 4000);
          return;
        }
        if (timer.current) clearTimeout(timer.current);
        setBusy(true);
        try {
          await onConfirm();
        } finally {
          setBusy(false);
          setArmed(false);
        }
      }}
      className={cx(
        "grid min-h-10 shrink-0 place-items-center rounded-lg px-2 text-[13px] font-semibold disabled:opacity-50",
        armed ? "bg-loss text-white" : "text-muted hover:text-loss",
        className,
      )}
    >
      {armed ? confirmText : (children ?? <IconTrash />)}
    </button>
  );
}
