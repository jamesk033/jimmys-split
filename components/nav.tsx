"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cx } from "./ui";
import { IconCalendar, IconDashboard, IconDumbbell, IconMore, IconNotes, IconSettings, IconSplit, IconTrades, IconX } from "./icons";

const ITEMS = [
  { href: "/", label: "Home", icon: IconDashboard },
  { href: "/history", label: "History", icon: IconTrades },
  { href: "/calendar", label: "Calendar", icon: IconCalendar },
  { href: "/split", label: "Split", icon: IconSplit },
  { href: "/notes", label: "Key notes", icon: IconNotes },
];
const BOTTOM = [{ href: "/settings", label: "Settings", icon: IconSettings }];

const active = (path: string, href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));

function Links({ path, onPick, items = ITEMS, label = "Main" }: { path: string; onPick?: () => void; items?: typeof ITEMS; label?: string }) {
  return (
    <nav className="grid gap-1" aria-label={label}>
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          onClick={onPick}
          className={cx("flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px]", active(path, i.href) ? "bg-accent font-semibold text-accent-ink shadow-[0_0_24px_rgba(167,139,250,0.35)]" : "text-muted hover:bg-panel2 hover:text-ink")}
        >
          <i.icon />
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

const Brand = () => (
  <Link href="/" className="text-xl font-bold tracking-tight">
    Jimmy&apos;s <span className="text-accent">Split</span>
  </Link>
);

/** `live` = a workout is in progress, so the main button says Resume. */
export function Nav({ email, live = false }: { email: string; live?: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const cta = live ? "Resume workout" : "Workout";
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col gap-5 overflow-y-auto border-r border-line bg-panel/80 px-3 py-5 backdrop-blur lg:flex">
        <div className="px-2">
          <Brand />
        </div>
        <Link href="/workout" className={cx("mx-1 flex min-h-11 items-center justify-center gap-2 rounded-lg font-semibold", active(path, "/workout") ? "bg-accent/20 text-accent ring-1 ring-accent" : "bg-accent text-accent-ink")}>
          <IconDumbbell /> {cta}
        </Link>
        <Links path={path} />
        <div className="mt-auto">
          <Links path={path} items={BOTTOM} label="More" />
        </div>
        <div className="grid gap-1 px-3 text-[12px] text-muted">
          <span className="truncate">{email}</span>
          <Link href="/privacy" className="hover:text-ink">
            Privacy and terms
          </Link>
        </div>
      </aside>

      <header className="safe-top sticky top-0 z-30 flex min-h-[3.75rem] items-center justify-center border-b border-line bg-bg/90 px-4 py-2 backdrop-blur lg:hidden">
        <Brand />
      </header>

      <nav aria-label="Tabs" className="safe-bottom fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-line bg-bg/95 px-1 pt-1 backdrop-blur lg:hidden">
        {(
          [
            ["/", "Home", IconDashboard],
            ["/history", "History", IconTrades],
            ["/workout", cta, IconDumbbell],
            ["/split", "Split", IconSplit],
            ["/notes", "Notes", IconNotes],
          ] as const
        ).map(([href, label, Icon]) =>
          href === "/workout" ? (
            <Link key={href} href={href} aria-label={label} className="grid place-items-center">
              <span className={cx("grid h-11 w-11 place-items-center rounded-2xl", live ? "bg-win text-black shadow-[0_0_24px_rgba(62,226,122,0.35)]" : "bg-accent text-accent-ink shadow-[0_0_24px_rgba(167,139,250,0.35)]")}>
                <Icon />
              </span>
            </Link>
          ) : (
            <Link key={href} href={href} className={cx("grid min-h-14 place-items-center content-center gap-0.5 rounded-xl text-[11px]", active(path, href) ? "text-accent" : "text-muted")}>
              <Icon />
              {label}
            </Link>
          ),
        )}
        <button type="button" onClick={() => setOpen(true)} className="grid min-h-14 place-items-center content-center gap-0.5 rounded-xl text-[11px] text-muted" aria-label="More pages">
          <IconMore />
          More
        </button>
      </nav>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="absolute inset-0 bg-black/60" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="safe-top absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-4 overflow-y-auto border-r border-line bg-panel p-4">
            <div className="flex items-center justify-between">
              <Brand />
              <button type="button" onClick={() => setOpen(false)} className="grid h-11 w-11 place-items-center rounded-lg text-muted" aria-label="Close">
                <IconX />
              </button>
            </div>
            <Links path={path} onPick={() => setOpen(false)} />
            <div className="mt-auto">
              <Links path={path} onPick={() => setOpen(false)} items={BOTTOM} label="More" />
            </div>
            <div className="truncate px-3 text-[12px] text-muted">{email}</div>
          </div>
        </div>
      )}
    </>
  );
}
