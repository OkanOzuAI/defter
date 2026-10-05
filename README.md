# Defter

Multi-user workout, nutrition and cardio tracker. Vite + React + TypeScript on Vercel (Hobby),
Supabase (Free) for accounts and Postgres. Your data lives in Supabase, so logging in from any
device brings your whole archive with you.

Status: phases 1–2 of 12 are built (scaffold, TR/EN, database schema, accounts, onboarding).
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
