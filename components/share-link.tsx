"use client";
import { useEffect, useState } from "react";
import { setWorkoutShare } from "@/app/actions/lift";
import { IconLink } from "./icons";
import { Button } from "./ui";

/** A finished workout's public read-only link: on gives a link anyone can open, off kills it. */
export function ShareLink({ id, initial, disabled = false }: { id: string; initial: string | null; disabled?: boolean }) {
  const [token, setToken] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = token ? `${origin}/l/${token}` : "";
  const toggle = async () => {
    setBusy(true);
    setErr("");
    const res = await setWorkoutShare(id, !token).catch(() => ({ ok: false as const, error: "Couldn't save. Check your connection." }));
    setBusy(false);
    if (!res.ok) return setErr(res.error);
    setToken(res.token);
    setCopied(false);
  };
  return (
    <div className="mt-4 grid gap-2 border-t border-line pt-4">
      <label className="flex min-h-11 items-center gap-2 text-[15px]">
        <input type="checkbox" className="h-5 w-5 accent-[var(--color-accent)]" checked={!!token} disabled={busy || disabled} onChange={toggle} />
        <IconLink width={18} height={18} className="text-muted" />
        {busy ? "Saving…" : token ? "Public link on" : "Public link (anyone with it can view this workout)"}
      </label>
      {token && (
        <div className="flex min-w-0 items-center gap-2">
          <input readOnly value={url} aria-label="Public link" onFocus={(e) => e.currentTarget.select()} className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 text-[14px] text-muted outline-none" />
          <Button
            type="button"
            variant="ghost"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
              } catch {
                setErr("Couldn't copy. Select the link and copy it.");
              }
            }}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      )}
      {err && <p className="text-[13px] text-loss">{err}</p>}
    </div>
  );
}
