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
- Local check: `PREVIEW_MODE=1 npx next start -p 3456` then /preview/home, /preview/start, /preview/workout, /preview/done, /preview/split, /preview/notes, /preview/history, /preview/calendar, /preview/units (add ?u=kg for kilos).
- Before pushing: `npx tsc --noEmit && npx vitest run && npx next build`.

## Rules baked into the code
- Split is Upper / Lower x infinity: next day = opposite of the last finished workout (lib/lift.ts `nextDay`). Rest days change nothing.
- Weights stored in pounds (`*_lb` columns), shown in the user's unit (lib/units.ts). Units are picked right after sign-up (layout gate) and in Settings.
- One workout in progress at a time (unique index).
- Workout screen tabs: Pre-lift / Workout / Post-lift / Refuel. Autosaves everything. Each exercise has a "Next time" weight with +/- (5 lb or 2.5 kg) that writes to the split.
- A new weight on a set carries down to later unchecked sets of that exercise.
- Est. max = Epley, sets of 1 to 12 reps only. PR = beats every earlier workout; first time doing a lift isn't a PR.
- New accounts copy the admin's (first `app_admins` row) split, checklists and key notes via `lift_template()`, never weights. Falls back to lib/defaults.ts.

## Ideas not built yet (only if asked)
- AI coach chat (Gemini), share image of a workout, push reminders, guest mode, rest timer, plate calculator, bodyweight chart.
