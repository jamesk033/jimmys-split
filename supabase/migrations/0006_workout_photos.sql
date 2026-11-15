-- Jimmy's Split: photos on workouts. Files go in the same private storage bucket as Jimmy's Journal
-- ('journal-images', each user's own folder), under <user id>/lift-<workout id>/. Safe to run more than once.

create table if not exists public.lift_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id uuid not null references public.lift_sessions (id) on delete cascade,
  storage_path text not null check (char_length(storage_path) between 3 and 500),
  caption text not null default '' check (char_length(caption) <= 500),
  position bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lift_images_session on public.lift_images (session_id, position);

drop trigger if exists lift_images_touch on public.lift_images;
create trigger lift_images_touch before update on public.lift_images for each row execute function public.lift_touch();

alter table public.lift_images enable row level security;
drop policy if exists "own rows" on public.lift_images;
create policy "own rows" on public.lift_images for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and split_part(storage_path, '/', 1) = auth.uid()::text
    and exists (select 1 from public.lift_sessions s where s.id = session_id and s.user_id = auth.uid())
  );
grant select, insert, update, delete on public.lift_images to authenticated;

-- The storage bucket and its "own folder only" rules already exist from Jimmy's Journal (its 0001_init.sql).
