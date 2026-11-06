"use client";
import { useEffect, useState } from "react";
import { verseOfDay } from "@/lib/verse";

/** Daily Bible verse (KJV). Same verse as the TradingView indicator and the other Jimmy site; switches at midnight New York time without a refresh. */
export function DailyVerse() {
  const [v, setV] = useState(() => verseOfDay());
  useEffect(() => {
    const id = setInterval(() => {
      const next = verseOfDay();
      setV((cur) => (cur.index === next.index ? cur : next));
    }, 60_000);
    return () => clearInterval(id);
  }, []);
  return (
    <figure className="max-w-md sm:ml-auto sm:text-right" suppressHydrationWarning>
      <blockquote className="text-[14px] italic leading-snug text-ink/90" suppressHydrationWarning>
        {v.text}
      </blockquote>
      <figcaption className="mt-1 text-[12px] font-semibold text-accent" suppressHydrationWarning>
        {v.reference}
      </figcaption>
    </figure>
  );
}
