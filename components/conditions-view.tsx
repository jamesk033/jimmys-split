import type { CondGroup, CondRow, LiftConditions } from "@/lib/conditions";
import { MIN_N } from "@/lib/conditions";
import { titleCase } from "@/lib/title-case";
import { Card, Empty, cx } from "./ui";

const pct = (v: number) => `${Math.round(v * 100)}%`;

function Bar({ row, base }: { row: CondRow; base: number }) {
  const tone = row.n < MIN_N ? "bg-muted/40" : row.diff >= 0.1 ? "bg-win" : row.diff <= -0.1 ? "bg-loss" : "bg-accent";
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-panel2" aria-hidden>
      <div className={cx("h-full rounded-full", tone)} style={{ width: `${Math.round(row.rate * 100)}%` }} />
      <div className="absolute inset-y-0 w-0.5 bg-ink/60" style={{ left: `${Math.round(base * 100)}%` }} />
    </div>
  );
}

function Row({ row, base }: { row: CondRow; base: number }) {
  return (
    <li className="grid gap-1.5 py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 text-[15px]">{titleCase(row.label)}</span>
        <span className="num shrink-0 text-[14px]">
          <span className={cx("font-semibold", row.n >= MIN_N && row.diff >= 0.1 ? "text-win" : row.n >= MIN_N && row.diff <= -0.1 ? "text-loss" : "")}>{pct(row.rate)}</span>
          <span className="text-muted"> PR days · {row.prs}/{row.n}</span>
        </span>
      </div>
      <Bar row={row} base={base} />
    </li>
  );
}

function List({ rows, base }: { rows: CondRow[]; base: number }) {
  return (
    <ul className="divide-y divide-line">
      {rows.map((r) => (
        <Row key={r.label} row={r} base={base} />
      ))}
    </ul>
  );
}

/** Edges and leaks first, then every condition by group. */
export function ConditionsView({ data }: { data: LiftConditions }) {
  if (data.total < MIN_N)
    return (
      <Empty title="Not enough workouts yet">
        Conditions needs a few workouts where you repeat lifts, so it can tell PR days from flat days. Log {MIN_N - data.total} more and check back.
      </Empty>
    );
  return (
    <div className="grid gap-4">
      <Card>
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <div>
            <div className="num text-[28px] font-bold">{pct(data.base)}</div>
            <div className="text-[13px] text-muted">of workouts set a PR ({data.prDays} of {data.total})</div>
          </div>
          <p className="max-w-md text-[13px] text-muted">The line on each bar is that average. Green beats it by 10 points or more, red falls 10 short. Rows under {MIN_N} workouts are grey.</p>
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={<span className="text-win">Edges</span>} action={<span className="text-[12px] text-muted">More PRs with these</span>}>
          {data.edges.length ? <List rows={data.edges} base={data.base} /> : <p className="text-[14px] text-muted">Nothing stands out yet.</p>}
        </Card>
        <Card title={<span className="text-loss">Leaks</span>} action={<span className="text-[12px] text-muted">Fewer PRs with these</span>}>
          {data.leaks.length ? <List rows={data.leaks} base={data.base} /> : <p className="text-[14px] text-muted">Nothing stands out yet.</p>}
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {data.groups.map((g: CondGroup) => (
          <Card key={g.title} title={<span className="text-accent">{g.title}</span>} action={g.note ? <span className="text-[12px] text-muted">{g.note}</span> : undefined}>
            <List rows={g.rows} base={data.base} />
          </Card>
        ))}
      </div>
    </div>
  );
}
