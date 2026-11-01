/**
 * Daily Bible verse for the dashboard. The reference changes each day (Eastern time);
 * the text comes from bible-api.com in the World English Bible (public domain), cached for a day.
 */
export const VERSES = [
  "Proverbs 16:3", "Proverbs 3:5-6", "Philippians 4:6-7", "Philippians 4:13", "Joshua 1:9", "Isaiah 40:31", "Romans 8:28",
  "Proverbs 21:5", "Galatians 6:9", "James 1:5", "Psalm 46:10", "Matthew 6:33", "Proverbs 13:11", "Colossians 3:23",
  "2 Timothy 1:7", "Hebrews 12:11", "Proverbs 14:23", "Ecclesiastes 7:8", "Psalm 37:7", "Proverbs 19:21", "Isaiah 41:10",
  "James 1:2-4", "Romans 12:2", "Proverbs 4:23", "Matthew 6:34", "1 Corinthians 9:24", "Proverbs 12:24", "Psalm 23:1",
  "Proverbs 16:9", "Lamentations 3:22-23", "Proverbs 22:29", "Romans 5:3-4", "Psalm 118:24", "Proverbs 10:4", "Micah 6:8",
  "Hebrews 11:1", "Proverbs 27:23-24", "Psalm 121:1-2", "1 Peter 5:7", "Proverbs 15:22", "John 16:33", "Psalm 27:14",
  "Proverbs 24:16", "2 Corinthians 4:16-17", "Ecclesiastes 9:10", "Proverbs 11:2", "Psalm 32:8", "Romans 15:13",
  "Proverbs 28:20", "1 Timothy 6:6", "Psalm 37:4", "Isaiah 26:3", "Proverbs 6:6-8", "Luke 16:10", "Psalm 55:22",
  "Proverbs 23:4", "Hebrews 13:5", "Jeremiah 29:11", "Psalm 90:12", "Proverbs 1:5",
];

export function verseOfDay(date: string): string {
  const day = Math.floor(Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)) / 86_400_000);
  return VERSES[((day % VERSES.length) + VERSES.length) % VERSES.length];
}

export interface Verse {
  reference: string;
  text: string;
}

/** Never throws: no verse is shown if the lookup fails. */
export async function fetchVerse(reference: string): Promise<Verse | null> {
  try {
    const res = await fetch(`https://bible-api.com/${encodeURIComponent(reference)}?translation=web`, { next: { revalidate: 86_400 } });
    if (!res.ok) return null;
    const j = (await res.json()) as { reference?: string; text?: string };
    const text = (j.text ?? "").replace(/\s+/g, " ").trim();
    return text ? { reference: j.reference ?? reference, text } : null;
  } catch {
    return null;
  }
}
