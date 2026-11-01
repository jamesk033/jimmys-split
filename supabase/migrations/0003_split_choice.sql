-- Jimmy's Split: new accounts choose Jimmy's split or their own. Safe to run more than once.
alter table public.lift_settings add column if not exists setup text check (setup in ('template', 'own'));
update public.lift_settings s set setup = 'own'
where setup is null and exists (select 1 from public.lift_days d where d.user_id = s.user_id);
