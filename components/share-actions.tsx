"use client";
import { useEffect, useRef, useState } from "react";
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
  make: () => HTMLCanvasElement | Promise<HTMLCanvasElement>;
  filename: string;
  label?: string;
  /** Shown only when the Discord channel is set up. */
  /** `auto`: post once as soon as this shows (right after Finish workout), unless it was posted before. */
  discord?: { kind: "workout" | "week" | "month"; title: string; session?: string; posted?: boolean; auto?: boolean } | null;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(discord?.posted ? { ok: true, text: "Posted to Discord." } : null);
  const post = async () => {
    if (!discord) return;
    setMsg(null);
    const blob = await toBlob(await make());
    if (!blob) return setMsg({ ok: false, text: "Couldn't make the image." });
    const form = new FormData();
    form.append("kind", discord.kind);
    form.append("title", discord.title);
    if (discord.session) form.append("session", discord.session);
    form.append("image", blob, filename);
    const res = await postToDiscord(form);
    setMsg(res.ok ? { ok: true, text: "Posted to Discord." } : { ok: false, text: res.error });
  };
  const autoRan = useRef(false);
  useEffect(() => {
    if (autoRan.current || !discord?.auto || discord.posted) return;
    autoRan.current = true;
    setBusy(true);
    post().finally(() => setBusy(false));
    // Runs once when the finished workout opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
        <Button variant="subtle" disabled={busy} onClick={run(async () => shareCanvas(await make(), filename))}>
          {label}
        </Button>
        <Button variant="ghost" disabled={busy} onClick={run(async () => downloadCanvas(await make(), filename))}>
          Download
        </Button>
        {discord && (
          <Button
            variant="ghost"
            disabled={busy}
            onClick={run(post)}
          >
            {busy ? "Working…" : msg?.ok && msg.text === "Posted to Discord." ? "Post again" : "Post to Discord"}
          </Button>
        )}
      </div>
      {msg && <p className={cx("text-[13px]", msg.ok ? "text-win" : "text-loss")}>{msg.text}</p>}
    </div>
  );
}
