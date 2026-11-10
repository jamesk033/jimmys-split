# Jimmy's Split: handoff notes

Lifting log (PWA) built by ICT_Jimmy (GitHub jamesk033). Sister site of Jimmy's Journal and built the same way. Read this first in any new chat.

## Where things live
- Repo: github.com/jamesk033/jimmys-split. Vercel project jimmys-split (pushes to main deploy automatically).
- Supabase: SAME project as Jimmy's Journal (ref qlpsjzjfmvrwgtpejvfs), so one account works on both. Tables are prefixed `lift_`. Username lives in the journal's `user_settings.username`.
- Migrations in `supabase/migrations/`. The owner pastes them into https://supabase.com/dashboard/project/qlpsjzjfmvrwgtpejvfs/sql/new . Always give new SQL inline in a code block.

## How the owner wants to work
- Direct and brief. Bullet or numbered lists. No em dashes.
- Include direct links when asking him to open something.
- Don't list problems unless asked; just say what to do.
- No redundancy: never show the same control twice on a page.
- Push everything live. Commit as jamesk033 / jameskester033@gmail.com.
- Never fabricate testimonials or stats.

## Stack
- Next.js 15 App Router, React 19, TypeScript, Tailwind 4, Recharts, zod. Supabase with RLS. Vitest + PGlite schema tests.
- Local check: `PREVIEW_MODE=1 npx next start -p 3456` then /preview/home, /preview/start, /preview/workout (preview uses lib/preview-owner.json), /preview/done, /preview/split, /preview/notes, /preview/history, /preview/calendar, /preview/units, /preview/choice, /preview/split-empty, /preview/startover (add ?u=kg for kilos).
- Before pushing: `npx tsc --noEmit && npx vitest run && npx next build`.

## Rules baked into the code
- The split is a rotation of named days (`lift_days`, owner's: A Upper 1, A Lower 1, A Upper 2, A Lower 2, B Upper 1, B Lower 1, B Upper 2, B Lower 2). Next day = the one after the last finished workout, wrapping around (lib/lift.ts `nextDay`). "Log rest day" saves a rest row that doesn't move the rotation. Any past day with nothing logged (from the first log, last 90 days) is saved as a rest day on the next page load (`backfillRestDays` in lib/data.ts); one rest row per date (0004).
- Exercise list (`lift_exercises`): muscle, name, equipment, sets (1 working set), rep range, weight, notes, alternative. Days point at exercises (`lift_day_exercises`), so weight carries across every day using it.
- Split page: every day is open at once (2 columns on desktop). Days and exercises reorder by dragging a grip (@dnd-kit, mouse/touch/keyboard; no arrows). "Edit as text" tab shows the whole split in the import format (`splitToText`) and `replaceSplit` rebuilds days from it, matching exercises by name so notes, alternatives and history stay. Exercises are added through a day (type a new name or pick one from the list) and edited right in the day (tap a row). An exercise on no day is deleted (`pruneUnused` after day edits, `removeUnusedExercises` on the Split page) and drops off Home's progress and best lifts. Past workouts keep their sets.
- Every delete uses `ConfirmDelete` (components/confirm-delete.tsx, same as Jimmy's Journal): tap once to arm, again to delete. No browser confirm popups.
- Rep ranges: 4-8 default, 4-6 hack squat and RDL, 6-10 forearms. Beat the top of the range (9, 7, 11) and the workout shows "Go up next time" (`shouldGoUp`).
- Weights stored in pounds (`*_lb` columns), shown in the user's unit (lib/units.ts). Units are picked right after sign-up (layout gate) and in Settings.
- One workout in progress at a time (unique index).
- Workout screen tabs: Pre-lift / Workout / Post-lift / Refuel. Autosaves everything. Each exercise has a "Next time" weight with +/- (5 lb or 2.5 kg) that writes to the exercise list.
- Est. max = Epley, sets of 1 to 12 reps only. PR = beats every earlier workout; first time doing a lift isn't a PR.
- Owner's own split, weights, checklists and notes are loaded by `0002_owner_split.sql`.
- After sign-up: username, then lbs/kg, then choose (layout gate, `lift_settings.setup`): "Use Jimmy's split" copies the admin's (first `app_admins` row) days, exercise list, checklists and key notes via `lift_template()`, never weights; "Build my own" starts empty. Settings has "Start over" to switch (type RESET; workouts stay).
- Paste-in import on the Split page (lib/import.ts): day name line, then "Muscle - Exercise - Equipment | weight | reps" lines, blank line between days. Reuses exercises with the same name.
- Workout tabs: ⇅ button puts Pre-lift / Workout / Post-lift / Refuel in the user's order with up/down arrows (`lift_settings.tab_order`, `saveTabOrder`). The workout Edit panel autosaves (no Save button).
- Share pictures (lib/share-cards.ts, canvas, 1080 wide): finished workout (History detail), month (Calendar), weekly recap (Home "This week"). Share / Download / Post to Discord (components/share-actions.tsx). Discord channel = `site_settings` key `lift_discord_webhook`, set by the admin in Settings; non-admins need `SUPABASE_SERVICE_ROLE_KEY` in Vercel env for the server to read it (lib/site-settings.ts). Feedback goes to the journal's `discord_feedback` channel.
- /faq: Help page (public) with a feedback form for signed-in users. Help is in the nav.
- Guest mode: "Look around without an account" (login and welcome) hits /guest, sets cookie `js_guest`; getContext returns example data (lib/preview-data.ts) and `GuestGate` blocks anything that changes data. Elements marked `data-guest-ok` stay usable (nav, tabs, expanders).
- First-run checklist on Home (components/first-run.tsx, hide saved in localStorage).
- No tick boxes on sets: a set with reps is done (`isDone`). The set number turns green once reps are in. Each exercise in a workout has Edit: change details (saves to exercise list), swap to the alternative for today, or remove from this workout.

## Ideas not built yet (only if asked)
- Push reminders, rest timer, plate calculator, bodyweight chart.
