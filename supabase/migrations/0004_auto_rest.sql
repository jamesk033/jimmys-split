-- Jimmy's Split: at most one rest day per date, so auto rest days never double up. Safe to run more than once.
delete from public.lift_sessions a using public.lift_sessions b
where a.rest and b.rest and a.user_id = b.user_id and a.date = b.date and a.id > b.id;
create unique index if not exists lift_sessions_one_rest_per_day on public.lift_sessions (user_id, date) where rest;
