"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonClass } from "./ui";

const FIELDS = 'input,textarea,select,[contenteditable="true"]';
const ACTIONS = `${FIELDS},button,label,summary,[role="button"],[role="checkbox"],[role="switch"],[role="radio"]`;

/** Anything that would change data. Links (moving between pages) and [data-guest-ok] stay usable. */
function blocked(t: EventTarget | null): t is Element {
  if (!(t instanceof Element)) return false;
  if (t.closest("[data-guest-ok]")) return false;
  const hit = t.closest(ACTIONS);
  if (!hit) return false;
  // A link nearer the tap than the control (e.g. a link inside a label) just navigates.
  const link = t.closest("a[href]");
  return !(link && hit.contains(link));
}

/**
 * Guest mode: a banner, and a sign-up prompt the moment a guest types, ticks or presses
 * anything. Nothing they do reaches the database either way.
 */
export function GuestGate() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const stop = (e: Event) => {
      if (!blocked(e.target)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setOpen(true);
    };
    const onFocus = (e: FocusEvent) => {
      const t = e.target;
      if (t instanceof HTMLElement && blocked(t) && t.matches(FIELDS)) {
        t.blur();
        setOpen(true);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const opts = { capture: true };
    for (const ev of ["pointerdown", "mousedown", "click", "submit", "change", "input"]) document.addEventListener(ev, stop, opts);
    document.addEventListener("focusin", onFocus, opts);
    document.addEventListener("keydown", onKey);
    return () => {
      for (const ev of ["pointerdown", "mousedown", "click", "submit", "change", "input"]) document.removeEventListener(ev, stop, opts);
      document.removeEventListener("focusin", onFocus, opts);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <>
      <div data-guest-ok className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3">
        <p className="text-[14px]">
          <span className="font-semibold">You&apos;re looking around as a guest.</span> <span className="text-muted">This is example data.</span>
        </p>
        <div className="flex gap-2">
          <Link href="/login" className={buttonClass("ghost", "min-h-10 px-3 text-[14px]")}>
            Log in
          </Link>
          <Link href="/signup" className={buttonClass("primary", "min-h-10 px-3 text-[14px]")}>
            Create account
          </Link>
        </div>
      </div>
      {open && (
        <div data-guest-ok role="dialog" aria-modal="true" aria-labelledby="guest-title" className="fixed inset-0 z-50 grid place-items-center p-4">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-line bg-panel p-5 shadow-2xl">
            <h2 id="guest-title" className="text-[20px] font-semibold">
              Make a free account to do that
            </h2>
            <p className="mt-1.5 text-[15px] text-muted">Log in or create an account to log your own workouts. It takes a minute and it&apos;s free.</p>
            <div className="mt-5 grid gap-2">
              <Link href="/signup" className={buttonClass("primary", "w-full")}>
                Create account
              </Link>
              <Link href="/login" className={buttonClass("ghost", "w-full")}>
                Log in
              </Link>
              <button type="button" onClick={() => setOpen(false)} className="min-h-11 text-[14px] text-muted">
                Keep looking around
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
