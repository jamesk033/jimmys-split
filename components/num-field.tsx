"use client";
import { useEffect, useRef, useState } from "react";
import { cx } from "./ui";

/**
 * Number box that lets you type freely ("", "2", "22.5") and reports a number or null.
 * Follows outside changes (like the +/- buttons) while you're not typing in it.
 */
export function NumField({
  value,
  onChange,
  className,
  decimals = true,
  placeholder,
  label,
  id,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  className?: string;
  decimals?: boolean;
  placeholder?: string;
  label: string;
  id?: string;
}) {
  const [text, setText] = useState(value === null ? "" : String(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(value === null ? "" : String(value));
  }, [value]);
  return (
    <input
      id={id}
      aria-label={label}
      inputMode={decimals ? "decimal" : "numeric"}
      placeholder={placeholder}
      value={text}
      onFocus={(e) => {
        focused.current = true;
        e.currentTarget.select();
      }}
      onBlur={() => {
        focused.current = false;
        setText(value === null ? "" : String(value));
      }}
      onChange={(e) => {
        const t = e.target.value.replace(",", ".");
        if (!(decimals ? /^\d*\.?\d*$/ : /^\d*$/).test(t)) return;
        setText(t);
        onChange(t === "" || t === "." ? null : Number(t));
      }}
      className={cx("min-h-11 w-full rounded-lg border border-line bg-bg px-2 text-center text-[16px] tabular-nums text-ink placeholder:text-muted/50 focus:border-accent focus:outline-none", className)}
    />
  );
}
