import { fetchVerse, verseOfDay } from "@/lib/verse";

/** A short Bible verse that changes every day (World English Bible). */
export async function DailyVerse({ date }: { date: string }) {
  const v = await fetchVerse(verseOfDay(date));
  if (!v) return null;
  return (
    <figure className="max-w-md sm:ml-auto sm:text-right">
      <blockquote className="text-[14px] italic leading-snug text-ink/90">&ldquo;{v.text}&rdquo;</blockquote>
      <figcaption className="mt-1 text-[12px] font-semibold text-accent">{v.reference} (WEB)</figcaption>
    </figure>
  );
}
