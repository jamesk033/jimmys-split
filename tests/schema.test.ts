import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import path from "node:path";

const STUBS = `
create role authenticated nologin;
create role anon nologin;
create schema auth;
create table auth.users (id uuid primary key, email text, created_at timestamptz not null default now());
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth, public to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
`;
const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";
const SQL = readFileSync(path.join(__dirname, "../supabase/migrations/0001_lift.sql"), "utf8");
let db: PGlite;

async function as(user: string, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${user}', false); set role authenticated;`);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec("reset role;");
  }
}

describe("lift schema", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(STUBS);
    await db.exec(`insert into auth.users values ('${A}','a@x.com','2026-01-01'),('${B}','b@x.com','2026-02-01');`);
    await db.exec(SQL);
    await db.exec(`insert into public.app_admins (user_id) values ('${A}');`);
  });

  it("runs twice", async () => {
    await db.exec(SQL);
  });

  it("keeps each lifter's rows private", async () => {
    await as(A, `insert into lift_exercises (day, name, weight_lb) values ('upper', 'Bench', 315)`);
    expect((await as(B, `select * from lift_exercises`)).rows).toHaveLength(0);
    await expect(as(B, `insert into lift_exercises (user_id, day, name) values ('${A}', 'upper', 'Sneaky')`)).rejects.toThrow();
  });

  it("allows one workout in progress at a time", async () => {
    await as(A, `insert into lift_sessions (id, date, day) values ('aaaaaaaa-0000-4000-8000-000000000001', '2026-11-01', 'upper')`);
    await expect(as(A, `insert into lift_sessions (date, day) values ('2026-11-01', 'lower')`)).rejects.toThrow();
  });

  it("won't let someone add sets to another lifter's workout", async () => {
    await expect(as(B, `insert into lift_sets (session_id, name) values ('aaaaaaaa-0000-4000-8000-000000000001', 'Bench')`)).rejects.toThrow();
    await as(A, `insert into lift_sets (session_id, name, weight_lb, reps, done) values ('aaaaaaaa-0000-4000-8000-000000000001', 'Bench', 315, 3, true)`);
    expect((await as(A, `select * from lift_sets`)).rows).toHaveLength(1);
  });

  it("shares the owner's template without weights", async () => {
    await as(A, `insert into lift_checklist_items (kind, body) values ('pre', 'Chalk')`);
    const r = await as(B, `select lift_template() as t`);
    const t = (r.rows[0] as { t: { exercises: Record<string, unknown>[]; checklist: unknown[] } }).t;
    expect(t.exercises[0].name).toBe("Bench");
    expect(t.exercises[0]).not.toHaveProperty("weight_lb");
    expect(t.checklist).toHaveLength(1);
  });

  it("rejects units other than lb or kg", async () => {
    await as(B, `insert into lift_settings (units) values ('kg')`);
    await expect(as(B, `update lift_settings set units = 'stone'`)).rejects.toThrow();
  });
});
