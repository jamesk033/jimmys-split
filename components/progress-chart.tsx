"use client";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { shortDate } from "@/lib/time";
import type { Units } from "@/lib/types";
import { toUnit } from "@/lib/units";
import { Empty, Select } from "./ui";

const AX = { stroke: "var(--color-muted)", fontSize: 11 };
const ACCENT = "#a78bfa";
const tipStyle = { background: "var(--color-panel)", border: "1px solid var(--color-line)", borderRadius: 8, color: "var(--color-ink)", fontSize: 13 };

export type ProgressSeries = Record<string, { date: string; e1rm: number; top: number }[]>;

/** Estimated max over time for one lift at a time. */
export function ProgressChart({ series, units }: { series: ProgressSeries; units: Units }) {
  const names = Object.keys(series);
  const [name, setName] = useState(names[0] ?? "");
  const pts = (series[name] ?? []).map((p) => ({ ...p, e1rm: toUnit(p.e1rm, units) ?? 0, top: toUnit(p.top, units) ?? 0 }));
  if (!names.length) return <Empty title="No lifts logged yet">Finish a workout and your progress shows up here.</Empty>;
  return (
    <div className="grid gap-3">
      <Select data-guest-ok aria-label="Lift" value={name} onChange={(e) => setName(e.target.value)} className="sm:max-w-xs">
        {names.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </Select>
      {pts.length < 2 ? (
        <p className="text-[14px] text-muted">Log {name} one more time to see a trend.</p>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer>
            <AreaChart data={pts} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="pfill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={ACCENT} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-line)" vertical={false} />
              <XAxis dataKey="date" tick={AX} tickLine={false} axisLine={false} minTickGap={40} tickFormatter={(d: string) => shortDate(d)} />
              <YAxis tick={AX} tickLine={false} axisLine={false} width={44} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={tipStyle}
                labelFormatter={(d) => shortDate(String(d))}
                formatter={(v, k) => [`${Math.round(Number(v) * 10) / 10} ${units}`, k === "e1rm" ? "Est. max" : "Top set"]}
              />
              <Area type="monotone" dataKey="e1rm" stroke={ACCENT} strokeWidth={2} fill="url(#pfill)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
