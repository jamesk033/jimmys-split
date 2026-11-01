"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { resetWorkouts, setTimezone, setUnits, setUsername } from "@/app/actions/lift";
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
