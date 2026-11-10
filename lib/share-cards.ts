/**
 * Share pictures drawn on a canvas in the browser: a workout, a month and a week.
 * Same look as Jimmy's Journal: dark card, purple accent, brand along the bottom.
 */
const C = { bg: "#050506", panel: "#0e0e10", line: "#232327", muted: "#a1a1aa", ink: "#f4f4f5", accent: "#a78bfa", win: "#3ee27a", gold: "#fcd34d" };
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';
const W = 1080;
const PAD = 64;

function canvas(h: number) {
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = h;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, h);
  ctx.textBaseline = "alphabetic";
  return { cv, ctx };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Cut text to fit a width, with an ellipsis. */
function fit(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  return `${t}…`;
}

function brand(ctx: CanvasRenderingContext2D, h: number, handle: string) {
  ctx.fillStyle = C.line;
  ctx.fillRect(PAD, h - 128, W - PAD * 2, 2);
  ctx.font = `700 36px ${FONT}`;
  ctx.fillStyle = C.ink;
  ctx.fillText("Jimmy's", PAD, h - 58);
  const jw = ctx.measureText("Jimmy's ").width;
  ctx.fillStyle = C.accent;
  ctx.fillText("Split", PAD + jw, h - 58);
  ctx.fillStyle = C.muted;
  ctx.font = `500 26px ${FONT}`;
  ctx.textAlign = "right";
  ctx.fillText(handle ? `@${handle}` : "jimmys-split.vercel.app", W - PAD, h - 60);
  ctx.textAlign = "left";
}

function stat(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, label: string, value: string, color = C.ink) {
  roundRect(ctx, x, y, w, 132, 22);
  ctx.fillStyle = C.panel;
  ctx.fill();
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = C.muted;
  ctx.font = `700 20px ${FONT}`;
  ctx.fillText(label.toUpperCase(), x + 24, y + 42);
  ctx.fillStyle = color;
  ctx.font = `800 44px ${MONO}`;
  ctx.fillText(fit(ctx, value, w - 48), x + 24, y + 104);
}

function header(ctx: CanvasRenderingContext2D, eyebrow: string, title: string) {
  ctx.fillStyle = C.accent;
  ctx.font = `700 26px ${FONT}`;
  ctx.fillText(eyebrow.toUpperCase(), PAD, 104);
  ctx.fillStyle = C.ink;
  ctx.font = `800 76px ${FONT}`;
  ctx.fillText(fit(ctx, title, W - PAD * 2), PAD, 190);
}

// ---------- workout ----------

export interface WorkoutCardData {
  dayName: string;
  dateLabel: string;
  setsDone: number;
  setsTotal: number;
  volume: string;
  exercises: { muscle: string; name: string; top: string; pr: boolean }[];
  handle: string;
}

export function drawWorkoutCard(d: WorkoutCardData): HTMLCanvasElement {
  const rowH = 82;
  const listTop = 420;
  const h = Math.max(1350, listTop + d.exercises.length * rowH + 200);
  const { cv, ctx } = canvas(h);
  header(ctx, d.dateLabel, d.dayName);
  const sw = (W - PAD * 2 - 24) / 2;
  stat(ctx, PAD, 236, sw, "Sets", `${d.setsDone}/${d.setsTotal}`, d.setsTotal && d.setsDone === d.setsTotal ? C.win : C.ink);
  stat(ctx, PAD + sw + 24, 236, sw, "Moved", d.volume);
  let y = listTop;
  for (const e of d.exercises) {
    ctx.fillStyle = C.line;
    ctx.fillRect(PAD, y - 4, W - PAD * 2, 1);
    ctx.fillStyle = C.muted;
    ctx.font = `700 18px ${FONT}`;
    ctx.fillText(e.muscle.toUpperCase(), PAD, y + 26);
    ctx.fillStyle = C.ink;
    ctx.font = `600 30px ${FONT}`;
    const right = e.top;
    ctx.font = `700 30px ${MONO}`;
    const rw = ctx.measureText(right).width + (e.pr ? 86 : 0);
    ctx.font = `600 30px ${FONT}`;
    ctx.fillText(fit(ctx, e.name, W - PAD * 2 - rw - 24), PAD, y + 62);
    ctx.textAlign = "right";
    ctx.font = `700 30px ${MONO}`;
    ctx.fillStyle = e.top === "skipped" ? C.muted : C.ink;
    ctx.fillText(right, W - PAD - (e.pr ? 86 : 0), y + 62);
    if (e.pr) {
      ctx.fillStyle = C.gold;
      ctx.font = `800 24px ${FONT}`;
      ctx.fillText("PR", W - PAD, y + 60);
    }
    ctx.textAlign = "left";
    y += rowH;
  }
  brand(ctx, h, d.handle);
  return cv;
}

// ---------- month ----------

export interface MonthCardData {
  monthLabel: string;
  /** First day of the month, YYYY-MM-DD. */
  first: string;
  days: number;
  /** Per date: what was done. */
  marks: Record<string, { label: string; tone: "upper" | "lower" | "rest" }>;
  workouts: number;
  rests: number;
  handle: string;
}

export function drawMonthCard(d: MonthCardData): HTMLCanvasElement {
  const h = 1350;
  const { cv, ctx } = canvas(h);
  header(ctx, "Training month", d.monthLabel);
  const sw = (W - PAD * 2 - 24) / 2;
  stat(ctx, PAD, 236, sw, "Workouts", String(d.workouts), C.accent);
  stat(ctx, PAD + sw + 24, 236, sw, "Rest days", String(d.rests));
  const gap = 10;
  const cell = (W - PAD * 2 - gap * 6) / 7;
  const top = 430;
  ctx.font = `700 20px ${FONT}`;
  ctx.fillStyle = C.muted;
  ctx.textAlign = "center";
  ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].forEach((n, i) => ctx.fillText(n, PAD + i * (cell + gap) + cell / 2, top));
  const lead = (new Date(`${d.first}T00:00:00Z`).getUTCDay() + 6) % 7;
  for (let i = 0; i < d.days; i++) {
    const slot = lead + i;
    const x = PAD + (slot % 7) * (cell + gap);
    const y = top + 24 + Math.floor(slot / 7) * (cell * 0.86 + gap);
    const date = `${d.first.slice(0, 8)}${String(i + 1).padStart(2, "0")}`;
    const m = d.marks[date];
    roundRect(ctx, x, y, cell, cell * 0.86, 16);
    ctx.fillStyle = m?.tone === "upper" ? "rgba(167,139,250,0.22)" : m?.tone === "lower" ? "rgba(62,226,122,0.2)" : m?.tone === "rest" ? "#141417" : C.panel;
    ctx.fill();
    ctx.strokeStyle = m?.tone === "upper" ? "rgba(167,139,250,0.6)" : m?.tone === "lower" ? "rgba(62,226,122,0.55)" : C.line;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = m && m.tone !== "rest" ? C.ink : C.muted;
    ctx.font = `600 24px ${MONO}`;
    ctx.fillText(String(i + 1), x + cell / 2, y + 38);
    if (m) {
      ctx.fillStyle = m.tone === "upper" ? C.accent : m.tone === "lower" ? C.win : C.muted;
      ctx.font = `800 22px ${FONT}`;
      ctx.fillText(m.label, x + cell / 2, y + cell * 0.86 - 22);
    }
  }
  ctx.textAlign = "left";
  brand(ctx, h, d.handle);
  return cv;
}

// ---------- week ----------

export interface WeekCardData {
  weekLabel: string;
  workouts: { dateLabel: string; dayName: string; sets: number }[];
  rests: number;
  setsDone: number;
  volume: string;
  prs: { name: string; text: string }[];
  handle: string;
}

export function drawWeekCard(d: WeekCardData): HTMLCanvasElement {
  const rows = d.workouts.length + (d.prs.length ? d.prs.length + 1 : 0);
  const h = Math.max(1350, 600 + rows * 64 + 240);
  const { cv, ctx } = canvas(h);
  header(ctx, "Weekly recap", d.weekLabel);
  const sw = (W - PAD * 2 - 48) / 3;
  stat(ctx, PAD, 236, sw, "Workouts", String(d.workouts.length), C.accent);
  stat(ctx, PAD + sw + 24, 236, sw, "Sets", String(d.setsDone));
  stat(ctx, PAD + (sw + 24) * 2, 236, sw, "Moved", d.volume);
  let y = 450;
  ctx.fillStyle = C.muted;
  ctx.font = `700 22px ${FONT}`;
  ctx.fillText(`WORKOUTS${d.rests ? ` · ${d.rests} REST ${d.rests === 1 ? "DAY" : "DAYS"}` : ""}`, PAD, y);
  y += 56;
  if (!d.workouts.length) {
    ctx.fillStyle = C.muted;
    ctx.font = `500 30px ${FONT}`;
    ctx.fillText("No workouts this week yet.", PAD, y);
    y += 64;
  }
  for (const w of d.workouts) {
    ctx.fillStyle = C.ink;
    ctx.font = `700 32px ${FONT}`;
    ctx.fillText(fit(ctx, w.dayName, 520), PAD, y);
    ctx.fillStyle = C.muted;
    ctx.font = `500 28px ${FONT}`;
    ctx.textAlign = "right";
    ctx.fillText(`${w.dateLabel} · ${w.sets} sets`, W - PAD, y);
    ctx.textAlign = "left";
    y += 64;
  }
  if (d.prs.length) {
    y += 24;
    ctx.fillStyle = C.gold;
    ctx.font = `700 22px ${FONT}`;
    ctx.fillText("NEW PRS", PAD, y);
    y += 56;
    for (const p of d.prs) {
      ctx.fillStyle = C.ink;
      ctx.font = `600 30px ${FONT}`;
      ctx.font = `700 28px ${MONO}`;
      const tw = ctx.measureText(p.text).width;
      ctx.font = `600 30px ${FONT}`;
      ctx.fillText(fit(ctx, p.name, W - PAD * 2 - tw - 24), PAD, y);
      ctx.textAlign = "right";
      ctx.fillStyle = C.gold;
      ctx.font = `700 28px ${MONO}`;
      ctx.fillText(p.text, W - PAD, y);
      ctx.textAlign = "left";
      y += 64;
    }
  }
  brand(ctx, h, d.handle);
  return cv;
}

// ---------- share / download ----------

export const toBlob = (cv: HTMLCanvasElement) => new Promise<Blob | null>((res) => cv.toBlob(res, "image/png"));

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Phone share sheet when there is one, otherwise a download. */
export async function shareCanvas(cv: HTMLCanvasElement, filename: string) {
  const blob = await toBlob(cv);
  if (!blob) return;
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: "Jimmy's Split" });
      return;
    } catch {
      // cancelled: fall through to download
    }
  }
  downloadBlob(blob, filename);
}

export async function downloadCanvas(cv: HTMLCanvasElement, filename: string) {
  const blob = await toBlob(cv);
  if (blob) downloadBlob(blob, filename);
}
