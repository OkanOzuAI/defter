# Defter

Multi-user workout, nutrition and cardio tracker. Vite + React + TypeScript on Vercel (Hobby),
Supabase (Free) for accounts and Postgres. Your data lives in Supabase, so logging in from any
device brings your whole archive with you.

Status: phases 1–10 of 12 are built (scaffold, TR/EN, database schema, accounts, onboarding,
exercise library, calculations, workout logging with offline draft and sync queue, saved workouts and weekly plan, nutrition log and supplements,
cardio and steps, diet phases and the Today page,
progress charts, profile and settings).
This README is completed in phase 12.

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill in the two Supabase values
npm run dev                  # http://localhost:5173
```

`npm run build`, `npm run lint`, `npm test`.

## Supabase setup (once)

1. Create a free project at supabase.com (pick a region near you, e.g. Frankfurt).
2. SQL Editor → New query → paste all of `supabase/migrations/0001_init.sql` → Run.
3. Authentication → Sign In / Providers → Email: enabled, **Confirm email off**.
4. Authentication → URL Configuration: add `http://localhost:5173` to Redirect URLs
   (the Vercel URL is added after the first deploy, and becomes the Site URL).
5. Project Settings → API (or the "Connect" button): copy the Project URL and the
   anon / publishable key into `.env.local`. Never use the service_role / secret key.

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
