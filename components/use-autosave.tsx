"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type SaveState = "idle" | "pending" | "saving" | "saved" | "error";

/**
 * Saves `value` a moment after it stops changing. Saves run one at a time and the
 * latest value always wins, so fast typing never loses characters or saves out of order.
 * Pending changes are flushed when the page is hidden or the component unmounts.
 */
export function useAutosave<T>(
  value: T,
  save: (v: T) => Promise<{ ok: boolean; error?: string } | void>,
  opts: { delay?: number; enabled?: boolean } = {},
) {
  const { delay = 700, enabled = true } = opts;
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState("");
  const key = JSON.stringify(value);
  const lastSaved = useRef(key);
  const latest = useRef(value);
  const saveRef = useRef(save);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const running = useRef<Promise<void>>(Promise.resolve());
  latest.current = value;
  saveRef.current = save;

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const snapshot = latest.current;
    const k = JSON.stringify(snapshot);
    if (k === lastSaved.current) return running.current;
    running.current = running.current.then(async () => {
      if (k === lastSaved.current) return;
      setState("saving");
      try {
        const res = await saveRef.current(snapshot);
        if (res && res.ok === false) {
          setState("error");
          setError(res.error ?? "Couldn't save.");
          return;
        }
        lastSaved.current = k;
        setError("");
        setState(JSON.stringify(latest.current) === k ? "saved" : "pending");
      } catch {
        setState("error");
        setError("Couldn't save. Check your connection.");
      }
    });
    return running.current;
  }, []);

  useEffect(() => {
    if (!enabled || key === lastSaved.current) return;
    setState("pending");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, delay);
  }, [key, enabled, delay, flush]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);

  /** Mark the current value as already saved (e.g. after loading from the server). */
  const markSaved = useCallback((v: T) => {
    lastSaved.current = JSON.stringify(v);
  }, []);

  return { state, error, flush, markSaved };
}

export function SaveBadge({ state, error, idleText = "Saves automatically" }: { state: SaveState; error?: string; idleText?: string }) {
  const text = state === "pending" || state === "saving" ? "Saving…" : state === "saved" ? "Saved" : state === "error" ? error || "Couldn't save" : idleText;
  return (
    <span role="status" aria-live="polite" className={`text-[13px] ${state === "error" ? "text-loss" : state === "saved" ? "text-win" : "text-muted"}`}>
      {state === "saved" ? "✓ " : ""}
      {text}
    </span>
  );
}
