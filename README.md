# Defter

Multi-user workout, nutrition and cardio tracker. Bilingual (TR / EN), mobile-first, installable,
and free to run: Vite + React + TypeScript on Vercel Hobby, Supabase Free for accounts and
Postgres.

Live at https://defter-plum.vercel.app

Your data lives in Supabase, so logging in from any device brings your whole archive with you.
Every row belongs to one user and Postgres Row Level Security keeps it private to them.

## What it does

- **Bugün**: diet phase and day, today's planned workout, weight trend, calories, protein, salt,
  water, steps, cardio, supplement log.
- **Antrenman**: log sets with kg, reps, RIR (or RPE), failure chips, technique tags, set types
  and separate left/right sets. Rest timer, glossary, swap alternatives, supersets. Saved
  workouts with a weekly plan; start one "with values" or "exercises only". Summary with PRs.
- **Beslenme**: current weight and calories card, daily log (weight, macros, fiber, salt/sodium,
  water, sleep, energy), targets from the active diet phase.
- **Kardiyo**: steps with goal and streak, cardio sessions with type-specific fields, kcal
  estimates, presets, weekly summary.
- **İlerleme**: weight and TDEE trends, weekly nutrition, per-exercise strength, weekly hard sets
  per muscle, cardio, consistency, body measurements.
- **Profil**: settings, diet phases, supplements, exercise library with custom exercises, JSON /
  CSV export, JSON import, password change, account deletion.

The app never prescribes training: no default program, no suggested sets, reps or loads.

## Local setup

Requires Node 22.18 or newer.

```bash
npm install
cp .env.example .env.local   # then fill in the two Supabase values
npm run dev                  # http://localhost:5173
```

| Command             | What it does                                                |
| ------------------- | ----------------------------------------------------------- |
| `npm run dev`       | Dev server                                                  |
| `npm run build`     | Type-check and build to `dist/`                             |
| `npm run preview`   | Serve the production build locally                          |
| `npm run lint`      | ESLint                                                      |
| `npm test`          | Vitest (calculations, draft logic, series)                  |
| `npm run format`    | Prettier                                                    |
| `npm run rls-check` | Proves two users cannot reach each other's rows (see below) |

## Supabase setup (once)

Dashboard labels move around; look for the nearest match.

1. Create a free project at supabase.com. Pick a region near you (for Turkey: Frankfurt or
   Paris). In the security options keep **Data API** on, **Automatically expose new tables** off,
   **automatic RLS** on.
2. SQL Editor → New query → paste all of `supabase/migrations/0001_init.sql` → Run. Expect
   "Success. No rows returned". (With the CLI linked: `supabase db push`.)
3. Authentication → Sign In / Providers → Email: enabled, **Confirm email off**. Supabase's
   built-in mail sender only delivers to the project's own team, so with confirmation on, other
   people could register but never confirm.
4. Authentication → URL Configuration: add `http://localhost:5173` to Redirect URLs. After the
   first deploy, set Site URL to the Vercel URL and add it to Redirect URLs too.
5. Connect button (or Project Settings → API Keys): copy the Project URL and the
   anon / publishable key into `.env.local`. Never use the `service_role` / secret key anywhere
   in this project.

### Checking isolation

Create two throwaway users (Authentication → Users → Add user), put their credentials in
`.env.local` as `RLS_USER_A_EMAIL`, `RLS_USER_A_PASSWORD`, `RLS_USER_B_EMAIL`,
`RLS_USER_B_PASSWORD`, then:

```bash
npm run rls-check
```

User A creates a row in every table; user B then tries to select, update, delete and forge
them, and a signed-out client tries to read. The script removes its rows afterwards and exits
non-zero if any check fails.

## Deploy to Vercel (free)

Build command `npm run build`, output directory `dist`. `vercel.json` rewrites every path to
`index.html` so client-side routes survive a refresh.

**Option A, from GitHub (auto-deploys on every push)**

1. vercel.com → Add New… → Project → Import Git Repository → pick this repo.
2. Framework preset: Vite. Before deploying, open Environment Variables and add
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (same values as `.env.local`).
3. Deploy.

**Option B, from the terminal**

```bash
npx vercel          # first run links the project and makes a preview deploy
npx vercel env add VITE_SUPABASE_URL
npx vercel env add VITE_SUPABASE_ANON_KEY
npx vercel --prod
```

`VITE_` variables are baked in at build time: after adding or changing them, redeploy.

**Afterwards**: in Supabase → Authentication → URL Configuration, set Site URL to the final
Vercel URL and add it to Redirect URLs.

## Install on a phone

- **iPhone**: open the site in Safari → Share → **Add to Home Screen**. It then opens full
  screen like an app. (Vibration at the end of the rest timer is not available on iOS; the beep
  and the on-screen timer are.)
- **Android**: Chrome → menu → Install app / Add to Home screen.

## Offline behaviour

- The active workout is a draft in the browser's storage, rewritten on every input. Closing the
  tab, locking the phone or losing signal does not lose it.
- Completed sets are sent to Supabase as soon as they are checked. Offline they wait in a queue
  that is flushed when the connection returns, on app start and every 20 seconds. The small
  indicator on the workout screen shows saved / pending / offline.
- Saved workouts, custom exercises and your last sets are cached so a workout can be started and
  logged without signal. The daily log keeps typed values until they can be saved.
- Other pages need a connection to load fresh data and show an offline banner without one.

## Backup

Profile → Data → **Tüm verimi JSON olarak indir** downloads every row of your account in one
file. Keep a copy now and then: the Supabase free plan has no automatic backups you can restore
yourself, and a free project is paused after about a week without activity (it can be resumed
from the dashboard; data is kept).

**JSON içe aktar** merges such a file back into the signed-in account. Daily logs, sets and
cardio can also be downloaded as CSV.

## Project layout

```
src/api/        Supabase calls as plain functions (one file per area)
src/auth/       session provider, route guards, profile cache
src/lib/        calc.ts (all formulas), dates, numbers, diet helpers, CSV
src/data/       static exercise library, supplement seed list
src/i18n/       tr.ts and en.ts with identical keys (a missing key fails the build)
src/workout/    draft, offline queue, templates, set and exercise components
src/nutrition/  daily form, supplements, weight card
src/cardio/     cardio form and statistics
src/progress/   chart series and sections
src/pages/      one file per route
supabase/migrations/0001_init.sql   tables, RLS policies, delete_my_account()
scripts/rls-check.ts                cross-user isolation check
```

## Decisions

- **Storage**: Supabase, not Vercel. Vercel Hobby has no free first-party database with user
  accounts; Supabase Free gives Auth + Postgres + Row Level Security in one place.
- **ESLint instead of oxlint**: the current Vite template ships oxlint; the spec asks for ESLint +
  Prettier, so the template's linter was swapped.
- **i18n store**: language lives in a tiny `useSyncExternalStore` store rather than a React context,
  so non-React code (profile load) can set it. Same `t()` hook for components.
- **Username**: 3–20 chars, `a–z 0–9 _`, stored lowercase, enforced by a check constraint.
- **Extra profile columns**: daily targets (sodium, water, sleep, fiber) and the two default rest
  times live on `profiles`, since section 6.7 needs somewhere to keep them.
- **Extra columns elsewhere**: `workout_sessions.exercises` (jsonb: order, note, tempo, superset per
  exercise) and `diet_phases.protein_rest / carbs_rest / fat_rest` (rest-day macros; fall back to the
  training-day values when empty).
- **Composite foreign keys**: `set_logs → workout_sessions`, `supplement_logs → supplements` and
  `workout_sessions → workout_templates` reference `(id, user_id)`, so a row can never be attached
  to another user's parent row even if its id is known.
- **Indexes**: dated tables get one `(user_id, date)` index, which also serves lookups by `user_id`.
- **Explicit grants**: the migration grants table access to `authenticated` and revokes it from
  `anon`, so it does not depend on the project's default Data API exposure setting.
- **Supplement seed**: names are stored in the language chosen at onboarding (they are the user's
  own editable rows afterwards). Macros per serving are left empty for the user to fill from their
  own label.
- **Offline profile**: the last loaded profile is cached on the device so the app still opens
  without signal; it is cleared on logout.
- **Timezone**: taken from the browser at onboarding, falling back to Europe/Istanbul.
- **Hard sets for one-sided work**: a set logged for L or R only counts as half a set per muscle,
  so an L + R pair counts once.
- **Adaptive TDEE trend**: the "trend weight change" is the least-squares slope of the weigh-ins in
  the 21-day window (kg/day × 7700), which is the spec's formula per day and is robust to one odd
  morning.
- **Cardio MET values**: 2011 Compendium. Where it lists a single value for a type (elliptical,
  stair machine, circuit/HIIT) that value is "moderate" and low/high are ×0.8 / ×1.2. Perceived
  intensity 1–3 = low, 4–6 or empty = moderate, 7–10 = high.
- **Only completed sets are stored**: open rows are scratch space in the draft. Tapping ✓ on an
  untouched row accepts the greyed-out values shown in it (last time's, or the left side just done).
- **Sync**: each completed set is upserted by its client UUID as soon as it is checked; offline it
  waits in a localStorage queue that is flushed on the `online` event, on app start and every 20 s.
- **Editing a past session** is not synced live: changes are sent when you save, so cancel cancels.
- **Unfinished sessions** (started on another device, never saved) appear in history marked
  "Tamamlanmadı / Not finished" rather than being hidden.
- **Supersets**: the rest timer starts after the last exercise of the group, not after each one.
- **Bar weights**: barbell 20 kg, EZ bar 10, trap bar 25, safety bar 30, Smith 0 (not logged).
- **Saving a session as a saved workout links it**: the session becomes the first run of the new
  template, so the next start is prefilled from it and later runs are compared with it.
- **Starting from a saved workout**: the template decides exercises and set layout; values come
  from the most recent session done from it, set by set, falling back to the template's own.
  A one-off swap therefore does not stick unless "Şablona kaydet" was ticked.
- **PRs**: an exercise with no earlier history reports no records (nothing to beat). Reps records
  are only reported at a weight that was used before.
- **Saved workouts are cached on the device** so one can be started without signal; the copy is
  removed on logout. The workout draft and the unsent queue are kept on logout on purpose.
- **Daily log autosave**: fields save about a second after typing stops. Unsaved text is kept on
  the device per day and sent when the connection returns; an unreadable number stays in the form
  and is not saved.
- **Salt first**: salt (g) and sodium (mg) are two inputs for the same stored value (`sodium_mg`);
  typing one fills the other. The salt target is derived from the sodium target.
- **"Since phase start"** compares the current trend (7-day average, or the latest weigh-in when
  there is no average yet) with the first weigh-in on or after the phase's start date.
- **Supplement servings**: caffeine and counted macros scale with the logged dose relative to the
  supplement's default dose. A streak is not broken by today not being logged yet.
- **Cardio distances**: rowing and swimming are typed in metres, everything else in km; all are
  stored as km. Speed is typed in the profile's unit (km/h or mph) and stored as km/h.
- **Cardio kcal**: the machine's number is stored as entered. Otherwise the estimate uses the most
  recent weigh-in of the last 60 days and is flagged; repeating or editing such a session
  re-estimates instead of treating the old estimate as entered.
- **Steps** are stored in the day's log (`daily_logs.steps`); the step goal lives on the profile.
- **Overlapping diet phases**: the one that started most recently wins. Adding a new phase does
  not close the previous one automatically; set its end date if you want the history exact.
- **Reverse diet**: both the training-day and the rest-day starting calories climb by the weekly
  step. Macro targets stay as entered.
- **Salt next to weight, not on it**: the spec asks for sodium "overlaid" on the weight chart. Two
  measures with different scales on one plot mislead, so salt is a small bar chart directly under
  the weight chart on the same days, which shows the same retention spikes.
- **Chart colours**: one accent for single-series charts; four fixed series colours (checked for
  colour-blind separation on both themes) for cardio types and left/right. More than four cardio
  types fold into a grey "Other".
- **Progress windows**: weight, nutrition and cardio follow the 30/90/180-day picker; hard sets
  show the current week plus the 8 before it; the training heatmap shows 12 weeks.
- **Custom exercises and overrides** are loaded into a small in-memory store (and cached on the
  device) so every screen can look an exercise up synchronously, offline included. Hidden
  exercises disappear from pickers but old sessions that used them still render.
- **JSON import is a merge**: rows are upserted by id (by day for daily logs and measurements) and
  re-owned by the signed-in account; nothing is deleted and the profile is left alone.
- **CSV files** start with a UTF-8 BOM so Excel shows Turkish characters correctly.
- **Deleting the account** also removes that user's local data (draft, queue, caches) on the device.
- **App updates ask first**: the spec lists `autoUpdate`, which reloads the page by itself. The
  service worker is registered in `prompt` mode instead: a "Güncelleme var" toast appears and the
  new version takes over when you tap "Yenile", so a reload never lands in the middle of a set.
- **Forgot password** is routed only when `VITE_EMAIL_ENABLED=true`; the reset link signs the user
  in and lands on the profile page, where the password can be changed.
- **Supplements are a log, not a checklist** (changed after first use, at the user's request): on
  Bugün you pick a supplement from the full list, type the amount actually taken and
  add it. Nothing is assumed to be taken daily; the same supplement can be added more than once.
  The default dose only prefills the amount field. Beslenme shows the selected day's entries as a
  one-line summary instead of a second copy of the list, so supplements are entered in one place
  (today only; past days are read-only).

## Roadmap (not built)

- Free custom SMTP (e.g. Resend or Brevo) → email confirmation and password reset
- CAPTCHA on sign-up (Cloudflare Turnstile via Supabase Auth)
- Food search and barcode scanning via Open Food Facts
- Plate calculator for barbell lifts
- Heart-rate zones from max HR
- Opt-in sharing of a saved workout with a friend via link (never automatic)
- Private progress photos (Supabase Storage)
- Supplement reminders (Web Push)
- CSV import from Hevy / Strong
- Deload week flag
