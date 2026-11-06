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
- Rep ranges: 4-8 default, 4-6 hack squat and RDL, 6-10 forearms. Beat the top of the range (9, 7, 11) and the workout shows "Go up next time" (`shouldGoUp`).
- Weights stored in pounds (`*_lb` columns), shown in the user's unit (lib/units.ts). Units are picked right after sign-up (layout gate) and in Settings.
- One workout in progress at a time (unique index).
- Workout screen tabs: Pre-lift / Workout / Post-lift / Refuel. Autosaves everything. Each exercise has a "Next time" weight with +/- (5 lb or 2.5 kg) that writes to the exercise list.
- Est. max = Epley, sets of 1 to 12 reps only. PR = beats every earlier workout; first time doing a lift isn't a PR.
- Owner's own split, weights, checklists and notes are loaded by `0002_owner_split.sql`.
- After sign-up: username, then lbs/kg, then choose (layout gate, `lift_settings.setup`): "Use Jimmy's split" copies the admin's (first `app_admins` row) days, exercise list, checklists and key notes via `lift_template()`, never weights; "Build my own" starts empty. Settings has "Start over" to switch (type RESET; workouts stay).
- Paste-in import on the Split page (lib/import.ts): day name line, then "Muscle - Exercise - Equipment | weight | reps" lines, blank line between days. Reuses exercises with the same name.
- No tick boxes on sets: a set with reps is done (`isDone`). The set number turns green once reps are in. Each exercise in a workout has Edit: change details (saves to exercise list), swap to the alternative for today, or remove from this workout.

- Daily Bible verse on Home (lib/verse.ts): 90 fixed KJV verses, New York date, index = floor(Date.UTC(y,m-1,d)/86400000) % 90, rechecks every 60s. Must match Jimmy's Journal and the TradingView indicator; never edit the list.

## Ideas not built yet (only if asked)
- AI coach chat (Gemini), share image of a workout, push reminders, guest mode, rest timer, plate calculator, bodyweight chart.
