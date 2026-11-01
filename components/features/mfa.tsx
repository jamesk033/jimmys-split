"use client";
import { useEffect, useState } from "react";
import { browserClient } from "@/lib/supabase/client";
import { Button, Card, Input, Label } from "../ui";

type Factor = { id: string; friendly_name?: string; factor_type: string; status: string };

/** Sign-in step: 6-digit code from the authenticator app. */
export function MfaChallenge({ next }: { next: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const sb = browserClient();
    const { data } = await sb.auth.mfa.listFactors();
    const f = data?.totp?.find((x: Factor) => x.status === "verified");
    if (!f) {
      setError("No authenticator is set up on this account.");
      setBusy(false);
      return;
    }
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: f.id, code: code.replace(/\s/g, "") });
    if (error) {
      setError("That code didn't work. Codes change every 30 seconds.");
      setBusy(false);
      return;
    }
    window.location.href = next;
  }
  return (
    <form onSubmit={verify} className="grid gap-4 rounded-xl border border-line bg-panel p-5">
      <div>
        <Label htmlFor="code">6-digit code</Label>
        <Input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} autoFocus />
      </div>
      {error && <p className="text-[14px] text-loss">{error}</p>}
      <Button type="submit" disabled={busy || code.replace(/\s/g, "").length < 6}>
        {busy ? "Checking…" : "Verify"}
      </Button>
    </form>
  );
}

/** Settings card: turn two-factor sign-in on or off. */
export function MfaSettings() {
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await browserClient().auth.mfa.listFactors();
    setFactors((data?.totp ?? []) as Factor[]);
  }
  useEffect(() => {
    load();
  }, []);
  const verified = factors?.filter((f) => f.status === "verified") ?? [];

  async function start() {
    setBusy(true);
    setMsg("");
    const sb = browserClient();
    // Clear half-finished setups first so a new one can start.
    for (const f of factors ?? []) if (f.status !== "verified") await sb.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: `Authenticator ${Date.now() % 10000}` });
    setBusy(false);
    if (error || !data) return setMsg(error?.message ?? "Couldn't start setup.");
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }
  async function confirm() {
    if (!enroll) return;
    setBusy(true);
    const { error } = await browserClient().auth.mfa.challengeAndVerify({ factorId: enroll.id, code: code.replace(/\s/g, "") });
    setBusy(false);
    if (error) return setMsg("That code didn't work. Try the newest one.");
    setEnroll(null);
    setCode("");
    setMsg("Two-factor is on. You'll enter a code each time you sign in.");
    load();
  }
  async function off(id: string) {
    setBusy(true);
    const { error } = await browserClient().auth.mfa.unenroll({ factorId: id });
    setBusy(false);
    setMsg(error ? error.message : "Two-factor is off.");
    load();
  }

  return (
    <Card title="Two-factor sign-in">
      {factors === null ? (
        <p className="text-[14px] text-muted">Loading…</p>
      ) : verified.length ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px] text-win">On. Sign-in asks for a code from your authenticator app.</p>
          <Button variant="danger" disabled={busy} onClick={() => off(verified[0].id)}>
            Turn off
          </Button>
        </div>
      ) : enroll ? (
        <div className="grid gap-3">
          <p className="text-[14px] text-muted">Scan this with Google Authenticator, 1Password or Authy, then type the 6-digit code.</p>
          <img src={enroll.qr} alt="Authenticator QR code" className="h-44 w-44 rounded-lg bg-white p-2" />
          <p className="num break-all text-[12px] text-muted">Or enter this key: {enroll.secret}</p>
          <div className="flex gap-2">
            <Input inputMode="numeric" autoComplete="one-time-code" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Code" />
            <Button disabled={busy || code.replace(/\s/g, "").length < 6} onClick={confirm}>
              Confirm
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px] text-muted">Add a code from an authenticator app on top of your password.</p>
          <Button variant="subtle" disabled={busy} onClick={start}>
            Turn on
          </Button>
        </div>
      )}
      {msg && <p className="mt-2 text-[13px] text-muted">{msg}</p>}
    </Card>
  );
}
