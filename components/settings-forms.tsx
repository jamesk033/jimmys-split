"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setLiftWebhook } from "@/app/actions/share";
import { chooseSplit, resetWorkouts, setTimezone, setUnits, setUsername, startOver } from "@/app/actions/lift";
import type { Units } from "@/lib/types";
import { Button, Card, Input, Label, Select, cx } from "./ui";

/** lbs or kg. Shown once right after sign-up, and in Settings. */
export function UnitsPicker({ current, first = false }: { current: Units | null; first?: boolean }) {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const pick = (u: Units) =>
    start(async () => {
      setErr("");
      const res = await setUnits(u);
      if (!res.ok) return setErr(res.error);
      router.refresh();
    });
  return (
    <Card title={first ? undefined : "Units"}>
      {first && (
        <>
          <h2 className="text-[22px] font-bold">Pounds or kilos?</h2>
          <p className="mb-4 mt-1 text-[15px] text-muted">Every weight on the site shows in this. You can switch any time in Settings and nothing gets lost.</p>
        </>
      )}
      <div role="radiogroup" aria-label="Units" className="grid max-w-sm grid-cols-2 gap-2">
        {(
          [
            ["lb", "lbs"],
            ["kg", "kg"],
          ] as const
        ).map(([u, label]) => (
          <button
            key={u}
            type="button"
            role="radio"
            aria-checked={current === u}
            disabled={pending}
            onClick={() => pick(u)}
            className={cx("min-h-14 rounded-xl border text-[18px] font-semibold", current === u ? "border-accent bg-accent/15 text-ink" : "border-line bg-bg text-muted hover:text-ink")}
          >
            {label}
          </button>
        ))}
      </div>
      {err && <p className="mt-2 text-[13px] text-loss">{err}</p>}
    </Card>
  );
}

export function UsernameForm({ current = "", first = false }: { current?: string; first?: boolean }) {
  const router = useRouter();
  const [v, setV] = useState(current);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <Card title={first ? undefined : "Username"}>
      {first && (
        <>
          <h2 className="text-[22px] font-bold">Pick your username</h2>
          <p className="mb-4 mt-1 text-[15px] text-muted">The same one is used on Jimmy&apos;s Journal. You still sign in with your email.</p>
        </>
      )}
      <form
        className="grid max-w-sm gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await setUsername(v);
            setMsg(res.ok ? { ok: true, text: "Saved." } : { ok: false, text: res.error });
            if (res.ok) router.refresh();
          });
        }}
      >
        <Label htmlFor="uname">Username</Label>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">@</span>
            <Input id="uname" value={v} onChange={(e) => setV(e.target.value.replace(/^@/, ""))} maxLength={20} autoComplete="username" placeholder="ICT_Jimmy" style={{ paddingLeft: 28 }} />
          </div>
          <Button type="submit" disabled={pending || !v.trim() || v.trim() === current}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
        <p className={msg ? (msg.ok ? "text-[13px] text-win" : "text-[13px] text-loss") : "text-[12px] text-muted"}>{msg?.text ?? "3 to 20 letters, numbers or underscores."}</p>
      </form>
    </Card>
  );
}

const ZONES = ["America/New_York", "America/Chicago", "America/Denver", "America/Phoenix", "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu", "Europe/London", "Europe/Berlin", "Asia/Tokyo", "Australia/Sydney"];

export function TimezoneForm({ current }: { current: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const zones = ZONES.includes(current) ? ZONES : [current, ...ZONES];
  return (
    <Card title="Timezone">
      <Label htmlFor="tz">Decides which date a workout counts for</Label>
      <Select
        id="tz"
        value={current}
        disabled={pending}
        onChange={(e) =>
          start(async () => {
            await setTimezone(e.target.value);
            router.refresh();
          })
        }
        className="max-w-sm"
      >
        {zones.map((z) => (
          <option key={z} value={z}>
            {z.replace("_", " ")}
          </option>
        ))}
      </Select>
    </Card>
  );
}

export function ResetForm() {
  const router = useRouter();
  const [v, setV] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <Card title="Delete all workouts">
      <p className="mb-3 text-[14px] text-muted">Wipes every workout. Your split, checklists and key notes stay. Type DELETE to confirm.</p>
      <form
        className="flex max-w-sm gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await resetWorkouts(v);
            setMsg(res.ok ? { ok: true, text: "All workouts deleted." } : { ok: false, text: res.error });
            if (res.ok) {
              setV("");
              router.refresh();
            }
          });
        }}
      >
        <Input aria-label="Type DELETE" value={v} onChange={(e) => setV(e.target.value)} placeholder="DELETE" />
        <Button type="submit" variant="danger" disabled={pending || v.trim().toUpperCase() !== "DELETE"}>
          Delete
        </Button>
      </form>
      {msg && <p className={cx("mt-2 text-[13px]", msg.ok ? "text-win" : "text-loss")}>{msg.text}</p>}
    </Card>
  );
}

const CHOICES = [
  ["template", "Use Jimmy's split", "ICT_Jimmy's 8-day Upper / Lower rotation with every exercise, rep range, form note, alternative, key notes and checklists. Weights start blank so you fill in yours."],
  ["own", "Build my own", "Start empty. Paste in your split or add days and exercises one at a time, then write your own notes and checklists."],
] as const;

/** Right after sign-up: copy Jimmy's split or start from scratch. */
export function SplitChoice() {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <Card>
      <h2 className="text-[22px] font-bold">How do you want to start?</h2>
      <p className="mb-4 mt-1 text-[15px] text-muted">You can change everything later, and start over from Settings any time.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {CHOICES.map(([k, title, body]) => (
          <button
            key={k}
            type="button"
            disabled={pending}
            onClick={() => {
              setPicked(k);
              start(async () => {
                setErr("");
                const res = await chooseSplit(k);
                if (!res.ok) return setErr(res.error);
                router.push(k === "own" ? "/split" : "/");
                router.refresh();
              });
            }}
            className={cx("grid gap-1 rounded-xl border p-4 text-left transition hover:border-accent", k === "template" ? "border-accent/50 bg-accent/10" : "border-line bg-bg")}
          >
            <span className="text-[17px] font-semibold">{pending && picked === k ? "Setting up…" : title}</span>
            <span className="text-[14px] text-muted">{body}</span>
          </button>
        ))}
      </div>
      {err && <p className="mt-2 text-[13px] text-loss">{err}</p>}
    </Card>
  );
}

/** Settings: swap to Jimmy's split or wipe to build your own. Workouts stay. */
export function StartOverForm({ current }: { current: "template" | "own" | null }) {
  const router = useRouter();
  const [choice, setChoice] = useState<"template" | "own">(current === "template" ? "own" : "template");
  const [v, setV] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <Card title="Start over">
      <p className="mb-3 text-[14px] text-muted">Replaces your split, exercise list, key notes and checklists. Your workout history stays.</p>
      <div role="radiogroup" aria-label="Start over with" className="mb-3 grid max-w-md grid-cols-2 gap-2">
        {CHOICES.map(([k, title]) => (
          <button key={k} type="button" role="radio" aria-checked={choice === k} onClick={() => setChoice(k)} className={cx("min-h-12 rounded-xl border px-3 text-[14px] font-semibold", choice === k ? "border-accent bg-accent/15 text-ink" : "border-line bg-bg text-muted hover:text-ink")}>
            {title}
          </button>
        ))}
      </div>
      <form
        className="flex max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await startOver(choice, v);
            setMsg(res.ok ? { ok: true, text: choice === "template" ? "Done. You're on Jimmy's split." : "Done. Your split is empty and ready to build." } : { ok: false, text: res.error });
            if (res.ok) {
              setV("");
              router.refresh();
            }
          });
        }}
      >
        <Input aria-label="Type RESET" value={v} onChange={(e) => setV(e.target.value)} placeholder="Type RESET" />
        <Button type="submit" variant="danger" disabled={pending || v.trim().toUpperCase() !== "RESET"}>
          {pending ? "Working…" : "Start over"}
        </Button>
      </form>
      {msg && <p className={cx("mt-2 text-[13px]", msg.ok ? "text-win" : "text-loss")}>{msg.text}</p>}
    </Card>
  );
}

/** Site owner only: the Discord channel everyone's workout, week and month pictures post to. */
export function DiscordForm({ current }: { current: string }) {
  const [v, setV] = useState(current);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <Card title="Discord channel (site owner)">
      <p className="mb-3 text-[14px] text-muted">
        Paste a channel&apos;s webhook link (Discord: channel settings, Integrations, Webhooks, New Webhook, Copy Webhook URL). Everyone&apos;s Post to Discord goes there. Leave it empty to turn posting off.
      </p>
      <form
        className="flex max-w-xl gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await setLiftWebhook(v);
            setMsg(res.ok ? { ok: true, text: v.trim() ? "Saved. Post to Discord is on." : "Posting is off." } : { ok: false, text: res.error });
          });
        }}
      >
        <Input aria-label="Discord webhook link" value={v} onChange={(e) => setV(e.target.value)} placeholder="https://discord.com/api/webhooks/..." />
        <Button type="submit" disabled={pending || v.trim() === current}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </form>
      {msg && <p className={cx("mt-2 text-[13px]", msg.ok ? "text-win" : "text-loss")}>{msg.text}</p>}
    </Card>
  );
}
