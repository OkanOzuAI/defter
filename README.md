# Defter

Multi-user workout, nutrition and cardio tracker. Vite + React + TypeScript on Vercel (Hobby),
Supabase (Free) for accounts and Postgres. Your data lives in Supabase, so logging in from any
device brings your whole archive with you.

Status: phases 1–4 of 12 are built (scaffold, TR/EN, database schema, accounts, onboarding,
exercise library, calculations, workout logging with offline draft and sync queue).
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
