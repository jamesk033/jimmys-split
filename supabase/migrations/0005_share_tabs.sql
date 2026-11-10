-- Jimmy's Split: your own workout tab order, and the Discord channel workouts post to. Safe to run more than once.

-- Order of the workout tabs (Pre-lift / Workout / Post-lift / Refuel), null = default.
alter table public.lift_settings add column if not exists tab_order text[];

-- When a workout was last posted to Discord.
alter table public.lift_sessions add column if not exists discord_posted_at timestamptz;

-- The Discord channel lifting posts go to lives in site_settings (made by Jimmy's Journal), key 'lift_discord_webhook'.
-- Only the admin can read or change it; the server reads it for everyone else.
