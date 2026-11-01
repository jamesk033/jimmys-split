import type { Units } from "./types";

/** Weights are stored in pounds and shown in the lifter's own unit. */
export const LB_PER_KG = 2.20462262;

const round = (v: number, step: number) => Math.round(v / step) * step;

export function toUnit(lb: number | null | undefined, units: Units): number | null {
  if (lb === null || lb === undefined || !Number.isFinite(lb)) return null;
  const v = units === "kg" ? lb / LB_PER_KG : lb;
  return Math.round(v * 10) / 10;
}

export function fromUnit(v: number | null | undefined, units: Units): number | null {
  if (v === null || v === undefined || !Number.isFinite(v)) return null;
  return units === "kg" ? Math.round(v * LB_PER_KG * 1000) / 1000 : v;
}

/** Plate jump for the +/- buttons. */
export const stepFor = (units: Units) => (units === "kg" ? 2.5 : 5);

export function fmtWeight(lb: number | null | undefined, units: Units, withUnit = true): string {
  const v = toUnit(lb, units);
  if (v === null) return "–";
  const s = Number.isInteger(v) ? v.toLocaleString("en-US") : v.toLocaleString("en-US", { maximumFractionDigits: 1 });
  return withUnit ? `${s} ${units}` : s;
}

/** Big totals like volume: whole numbers, with k for thousands. */
export function fmtBig(lb: number, units: Units): string {
  const v = toUnit(lb, units) ?? 0;
  if (v >= 100_000) return `${Math.round(v / 1000).toLocaleString("en-US")}k ${units}`;
  return `${Math.round(v).toLocaleString("en-US")} ${units}`;
}

/** Nearest plate step in the lifter's unit, back in pounds. */
export function snapLb(lb: number, units: Units): number {
  const v = toUnit(lb, units) ?? 0;
  return fromUnit(round(v, units === "kg" ? 0.5 : 1), units) ?? 0;
}
