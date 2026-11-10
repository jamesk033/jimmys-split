"use client";
import { useState } from "react";
import { postToDiscord } from "@/app/actions/share";
import { downloadCanvas, shareCanvas, toBlob } from "@/lib/share-cards";
import { Button, cx } from "./ui";

/** Share, Download and (when the site's channel is set) Post to Discord, all using the same picture. */
export function ShareActions({
  make,
  filename,
  label = "Share image",
  discord,
}: {
  make: () => HTMLCanvasElement;
  filename: string;
  label?: string;
  /** Shown only when the Discord channel is set up. */
  discord?: { kind: "workout" | "week" | "month"; title: string; session?: string; posted?: boolean } | null;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(discord?.posted ? { ok: true, text: "Posted to Discord before." } : null);
  const run = (fn: () => Promise<void>) => async () => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="subtle" disabled={busy} onClick={run(() => shareCanvas(make(), filename))}>
          {label}
        </Button>
        <Button variant="ghost" disabled={busy} onClick={run(() => downloadCanvas(make(), filename))}>
          Download
        </Button>
        {discord && (
          <Button
            variant="ghost"
            disabled={busy}
            onClick={run(async () => {
              setMsg(null);
              const blob = await toBlob(make());
              if (!blob) return setMsg({ ok: false, text: "Couldn't make the image." });
              const form = new FormData();
              form.append("kind", discord.kind);
              form.append("title", discord.title);
              if (discord.session) form.append("session", discord.session);
              form.append("image", blob, filename);
              const res = await postToDiscord(form);
              setMsg(res.ok ? { ok: true, text: "Posted to Discord." } : { ok: false, text: res.error });
            })}
          >
            {busy ? "Working…" : "Post to Discord"}
          </Button>
        )}
      </div>
      {msg && <p className={cx("text-[13px]", msg.ok ? "text-win" : "text-loss")}>{msg.text}</p>}
    </div>
  );
}
