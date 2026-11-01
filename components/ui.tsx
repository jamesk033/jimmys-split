import type React from "react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Card({ children, className, title, action }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode }) {
  return (
    <section className={cx("min-w-0 rounded-2xl border border-line bg-panel p-4 sm:p-5", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

type BtnVariant = "primary" | "ghost" | "danger" | "subtle";
export function buttonClass(variant: BtnVariant = "primary", className?: string) {
  const v = {
    primary: "bg-accent text-accent-ink hover:brightness-110",
    ghost: "border border-line text-ink hover:bg-panel2",
    danger: "border border-loss/50 text-loss hover:bg-loss/10",
    subtle: "bg-panel2 text-ink hover:brightness-125",
  }[variant];
  return cx(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-[15px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
    v,
    className,
  );
}
export function Button({ variant = "primary", className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  return <button {...p} className={buttonClass(variant, className)} />;
}

export function Label({ children, htmlFor, className }: { children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cx("mb-1 block text-[13px] text-muted", className)}>
      {children}
    </label>
  );
}

const field = "w-full min-h-11 rounded-lg border border-line bg-bg px-3 text-[16px] text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none";
export function Input(p: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={cx(field, p.className)} />;
}
export function Select(p: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...p} className={cx(field, "pr-8", p.className)} />;
}
export function Textarea(p: React.ComponentProps<"textarea">) {
  return <textarea {...p} className={cx(field, "min-h-24 py-2 leading-relaxed", p.className)} />;
}

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "win" | "loss" | "accent" | "warn"; className?: string }) {
  const t = {
    neutral: "bg-panel2 text-muted",
    win: "bg-win/15 text-win",
    loss: "bg-loss/15 text-loss",
    accent: "bg-accent/15 text-accent",
    warn: "bg-amber-400/15 text-amber-300",
  }[tone];
  return <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide", t, className)}>{children}</span>;
}

type Tone = "win" | "loss" | "accent";

/** One headline number as its own tile: tinted icon badge, label, big glowing value. */
export function Stat({ label, value, sub, tone, icon: Icon, iconTone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone; icon?: (p: React.SVGProps<SVGSVGElement>) => React.ReactElement; iconTone?: Tone }) {
  const c = tone === "win" ? "text-win glow-win" : tone === "loss" ? "text-loss glow-loss" : tone === "accent" ? "text-accent glow-accent" : "text-ink";
  const badge = { win: "bg-win/12 text-win", loss: "bg-loss/12 text-loss", accent: "bg-accent/15 text-accent" }[iconTone ?? tone ?? "accent"];
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-panel p-4">
      {Icon && (
        <span className={cx("mb-3 grid h-11 w-11 place-items-center rounded-xl", badge)}>
          <Icon />
        </span>
      )}
      <div className="text-[13px] text-muted">{label}</div>
      <div className={cx("mt-1 truncate text-[26px] font-bold leading-tight tabular-nums tracking-tight", c)}>{value}</div>
      {sub && <div className="mt-1 text-[12px] text-muted">{sub}</div>}
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{children}</div>;
}

export function Progress({ value, tone = "accent", label }: { value: number; tone?: "accent" | "win" | "loss" | "warn"; label?: string }) {
  const pctv = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const c = { accent: "bg-accent", win: "bg-win", loss: "bg-loss", warn: "bg-amber-400" }[tone];
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-panel2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pctv * 100)} aria-label={label}>
      <div className={cx("h-full rounded-full transition-[width]", c)} style={{ width: `${pctv * 100}%` }} />
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="grid justify-items-center gap-2 rounded-xl border border-dashed border-line p-8 text-center text-muted">
      <div className="text-[16px] font-semibold text-ink">{title}</div>
      {children}
    </div>
  );
}

export function PageHeader({ title, sub, action, eyebrow }: { title: string; sub?: ReactNode; action?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <div className="mb-0.5 text-[14px] text-muted">{eyebrow}</div>}
        <h1 className="text-2xl font-bold tracking-tight text-balance">{title}</h1>
        {sub && <div className="text-[14px] text-muted">{sub}</div>}
      </div>
      {action}
    </div>
  );
}
