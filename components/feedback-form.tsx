"use client";
import { useState, useTransition } from "react";
import { sendFeedback } from "@/app/actions/share";
import { Button, Label, Textarea } from "./ui";

/** Send feedback straight to the site owner's Discord feedback channel. */
export function FeedbackForm() {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await sendFeedback(text, document.referrer ? new URL(document.referrer).pathname : "");
          setMsg(res.ok ? { ok: true, text: "Sent. Thanks, ICT_Jimmy reads every one." } : { ok: false, text: res.error });
          if (res.ok) setText("");
        });
      }}
    >
      <Label htmlFor="feedback">Your message</Label>
      <Textarea id="feedback" value={text} onChange={(e) => setText(e.target.value)} maxLength={1800} placeholder="A bug, an idea, or something that confused you" className="min-h-28" />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || text.trim().length < 3}>
          {pending ? "Sending…" : "Send feedback"}
        </Button>
        {msg && (
          <span role="status" className={msg.ok ? "text-[14px] text-win" : "text-[14px] text-loss"}>
            {msg.text}
          </span>
        )}
      </div>
    </form>
  );
}
