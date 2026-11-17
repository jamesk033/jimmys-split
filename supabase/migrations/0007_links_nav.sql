-- Jimmy's Split: public share links for workouts, and your own sidebar order. Safe to run more than once.

-- Sidebar page order (drag to reorder), null = default.
alter table public.lift_settings add column if not exists nav_order text[];

-- Public read-only link per finished workout. Off unless you turn it on; turning it off kills the link.
alter table public.lift_sessions add column if not exists share_token text unique;

-- What a shared workout page may show: the day, date, sets, notes, first photo, username and units,
-- plus each lift's best estimated max from earlier workouts (so the page can mark PRs). Nothing else.
create or replace function public.shared_workout(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'date', s.date,
    'day_name', s.day_name,
    'notes', s.notes,
    'username', coalesce((select u.username from user_settings u where u.user_id = s.user_id), ''),
    'units', coalesce((select l.units from lift_settings l where l.user_id = s.user_id), 'lb'),
    'image_path', (select i.storage_path from lift_images i where i.session_id = s.id order by i.position limit 1),
    'sets', coalesce((
      select jsonb_agg(jsonb_build_object('name', x.name, 'target_reps', x.target_reps, 'position', x.position, 'set_no', x.set_no, 'weight_lb', x.weight_lb, 'reps', x.reps) order by x.position, x.set_no)
      from lift_sets x where x.session_id = s.id
    ), '[]'::jsonb),
    'prior', coalesce((
      select jsonb_object_agg(k, best) from (
        select lower(trim(x.name)) as k, max(case when x.reps = 1 then x.weight_lb else x.weight_lb * (1 + x.reps / 30.0) end) as best
        from lift_sets x join lift_sessions p on p.id = x.session_id
        where p.user_id = s.user_id and p.status = 'done' and not p.rest and p.id <> s.id
          and (p.date, p.started_at) < (s.date, s.started_at)
          and x.weight_lb > 0 and x.reps between 1 and 12
        group by lower(trim(x.name))
      ) b
    ), '{}'::jsonb)
  )
  from lift_sessions s
  where p_token is not null and length(p_token) >= 16 and s.share_token = p_token and s.status = 'done' and not s.rest;
$$;
revoke all on function public.shared_workout(text) from public;
grant execute on function public.shared_workout(text) to anon, authenticated;
