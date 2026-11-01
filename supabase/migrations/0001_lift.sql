-- Jimmy's Split: lifting log tables. Runs in the same Supabase project as Jimmy's Journal,
-- so one account works on both sites. Every table is private to its owner (Row Level Security).
-- Safe to run more than once.

create or replace function public.lift_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Already made by Jimmy's Journal; here so this file also works on a fresh project.
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------- settings ----------
create table if not exists public.lift_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  units text check (units in ('lb', 'kg')), -- null until picked after sign-up
  timezone text not null default 'America/Denver',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- exercise list (weight lives here, so it carries across every day that uses it) ----------
create table if not exists public.lift_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  muscle text not null default '' check (char_length(muscle) <= 60),
  name text not null check (char_length(name) between 1 and 120),
  equipment text not null default '' check (char_length(equipment) <= 120),
  sets integer not null default 1 check (sets between 1 and 20),
  reps text not null default '4-8' check (char_length(reps) <= 20),
  weight_lb numeric(8,3) check (weight_lb is null or (weight_lb >= 0 and weight_lb <= 5000)),
  note text not null default '' check (char_length(note) <= 500),
  alternative text not null default '' check (char_length(alternative) <= 200),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lift_exercises_user on public.lift_exercises (user_id, position);

-- ---------- workout days, in rotation order ----------
create table if not exists public.lift_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lift_days_user on public.lift_days (user_id, position);

create table if not exists public.lift_day_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day_id uuid not null references public.lift_days (id) on delete cascade,
  exercise_id uuid not null references public.lift_exercises (id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lift_day_exercises_day on public.lift_day_exercises (day_id, position);

-- ---------- checklists: pre-lift, post-lift, refuel ----------
create table if not exists public.lift_checklist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('pre', 'post', 'refuel')),
  body text not null check (char_length(body) between 1 and 200),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lift_checklist_user on public.lift_checklist_items (user_id, kind, position);

-- ---------- key notes ----------
create table if not exists public.lift_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  body text not null default '' check (char_length(body) <= 5000),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lift_notes_user on public.lift_notes (user_id, position);

-- ---------- workouts (and rest days) ----------
create table if not exists public.lift_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  day_id uuid references public.lift_days (id) on delete set null,
  day_name text not null default '' check (char_length(day_name) <= 60),
  rest boolean not null default false,
  status text not null default 'active' check (status in ('active', 'done')),
  pre_done text[] not null default '{}'::text[],
  post_done text[] not null default '{}'::text[],
  refuel_done text[] not null default '{}'::text[],
  bodyweight_lb numeric(8,3) check (bodyweight_lb is null or (bodyweight_lb > 0 and bodyweight_lb <= 2000)),
  notes text not null default '' check (char_length(notes) <= 4000),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lift_sessions_user on public.lift_sessions (user_id, date desc);
-- One workout in progress at a time.
create unique index if not exists lift_sessions_one_active on public.lift_sessions (user_id) where status = 'active';

create table if not exists public.lift_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id uuid not null references public.lift_sessions (id) on delete cascade,
  exercise_id uuid references public.lift_exercises (id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  target_reps text not null default '' check (char_length(target_reps) <= 20),
  position integer not null default 0,
  set_no integer not null default 1 check (set_no between 1 and 50),
  weight_lb numeric(8,3) check (weight_lb is null or (weight_lb >= 0 and weight_lb <= 5000)),
  reps integer check (reps is null or (reps >= 0 and reps <= 200)),
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lift_sets_session on public.lift_sets (session_id, position, set_no);
create index if not exists lift_sets_user on public.lift_sets (user_id, name);

-- ---------- updated_at ----------
do $$
declare t text;
begin
  foreach t in array array['lift_settings', 'lift_exercises', 'lift_days', 'lift_day_exercises', 'lift_checklist_items', 'lift_notes', 'lift_sessions', 'lift_sets'] loop
    execute format('drop trigger if exists %I_touch on public.%I', t, t);
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.lift_touch()', t, t);
  end loop;
end $$;

-- ---------- privacy ----------
do $$
declare t text;
begin
  foreach t in array array['lift_settings', 'lift_exercises', 'lift_days', 'lift_checklist_items', 'lift_notes', 'lift_sessions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

alter table public.lift_day_exercises enable row level security;
drop policy if exists "own rows" on public.lift_day_exercises;
create policy "own rows" on public.lift_day_exercises for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.lift_days d where d.id = day_id and d.user_id = auth.uid())
    and exists (select 1 from public.lift_exercises e where e.id = exercise_id and e.user_id = auth.uid())
  );

alter table public.lift_sets enable row level security;
drop policy if exists "own rows" on public.lift_sets;
create policy "own rows" on public.lift_sets for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.lift_sessions s where s.id = session_id and s.user_id = auth.uid()));

grant select, insert, update, delete on public.lift_settings, public.lift_exercises, public.lift_days, public.lift_day_exercises, public.lift_checklist_items, public.lift_notes, public.lift_sessions, public.lift_sets to authenticated;

-- ---------- starter template ----------
-- New accounts start from the site owner's split, exercise list, checklists and key notes. Never their weights.
create or replace function public.lift_template() returns jsonb
language sql stable security definer set search_path = public as $$
  with owner as (select user_id from app_admins order by created_at asc limit 1)
  select jsonb_build_object(
    'exercises', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'muscle', muscle, 'name', name, 'equipment', equipment, 'sets', sets, 'reps', reps, 'note', note, 'alternative', alternative, 'position', position) order by position)
                           from lift_exercises where user_id = (select user_id from owner)), '[]'::jsonb),
    'days', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'position', position) order by position)
                      from lift_days where user_id = (select user_id from owner)), '[]'::jsonb),
    'items', coalesce((select jsonb_agg(jsonb_build_object('day_id', day_id, 'exercise_id', exercise_id, 'position', position) order by position)
                       from lift_day_exercises where user_id = (select user_id from owner)), '[]'::jsonb),
    'checklist', coalesce((select jsonb_agg(jsonb_build_object('kind', kind, 'body', body, 'position', position) order by kind, position)
                           from lift_checklist_items where user_id = (select user_id from owner)), '[]'::jsonb),
    'notes', coalesce((select jsonb_agg(jsonb_build_object('title', title, 'body', body, 'position', position) order by position)
                       from lift_notes where user_id = (select user_id from owner)), '[]'::jsonb)
  );
$$;
revoke all on function public.lift_template() from public;
grant execute on function public.lift_template() to authenticated;
