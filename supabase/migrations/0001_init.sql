-- Defter: initial schema.
-- Every table is owned by one user. Row Level Security is the only thing between
-- one user's rows and another's, so every table gets the same four policies below.
-- Safe to run once on a fresh Supabase project (SQL Editor or `supabase db push`).

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profile (one row per auth user; id doubles as the owner column)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  language text not null default 'tr' check (language in ('tr', 'en')),
  height_cm numeric check (height_cm between 50 and 260),
  birth_year smallint check (birth_year between 1900 and 2100),
  sex text check (sex in ('male', 'female')),
  goal_weight numeric check (goal_weight between 20 and 400),
  activity_level text check (activity_level in ('sedentary', 'light', 'moderate', 'very', 'extra')),
  timezone text not null default 'Europe/Istanbul',
  intensity_display text not null default 'rir' check (intensity_display in ('rir', 'rpe')),
  speed_unit text not null default 'kmh' check (speed_unit in ('kmh', 'mph')),
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  -- Daily targets (section 6.7). Null = no target set.
  step_goal integer check (step_goal >= 0),
  sodium_target_mg integer check (sodium_target_mg >= 0),
  water_target_l numeric check (water_target_l >= 0),
  sleep_target_h numeric check (sleep_target_h >= 0),
  fiber_target_g numeric check (fiber_target_g >= 0),
  -- Default rest timer lengths; per-exercise overrides live in exercise_settings.
  rest_compound_sec integer not null default 180 check (rest_compound_sec between 0 and 3600),
  rest_isolation_sec integer not null default 90 check (rest_isolation_sec between 0 and 3600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Training
-- ---------------------------------------------------------------------------

create table public.custom_exercises (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  category text not null,
  equipment text not null,
  pattern text,
  primary_muscles text[] not null default '{}',
  secondary_muscles text[] not null default '{}',
  is_compound boolean not null default false,
  unilateral boolean not null default false,
  load_mode text not null default 'total'
    check (load_mode in ('total', 'per_hand', 'added_bodyweight')),
  increment numeric not null default 2.5 check (increment > 0),
  bar_weight numeric check (bar_weight >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Per-user overrides for library exercises (exercise_id = library slug or custom id).
create table public.exercise_settings (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_id text not null,
  hidden boolean not null default false,
  increment numeric check (increment > 0),
  bar_weight numeric check (bar_weight >= 0),
  rest_sec integer check (rest_sec between 0 and 3600),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

-- items: ordered exercises, each with superset group, note and its sets
-- (type, weight, reps, rir, failure, techniques, side).
create table public.workout_templates (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  note text,
  weekdays smallint[] not null default '{}' check (weekdays <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.workout_sessions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  name text,
  template_id uuid,
  started_at timestamptz,
  ended_at timestamptz,
  note text,
  -- Ordered exercises of this session with their note / tempo / superset group.
  exercises jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  -- Composite FK: a session can only point at a template of the same user.
  foreign key (template_id, user_id)
    references public.workout_templates (id, user_id)
    on delete set null (template_id)
);

create table public.set_logs (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id uuid not null,
  date date not null,
  exercise_id text not null,
  exercise_position smallint not null default 0,
  superset_group text,
  set_index smallint not null default 0,
  side text check (side in ('L', 'R')),
  set_type text not null default 'working'
    check (set_type in ('warmup', 'working', 'top', 'backoff', 'drop')),
  weight numeric check (weight >= 0),
  reps smallint check (reps >= 0),
  rir smallint check (rir between 0 and 10),
  failure text not null default 'none' check (failure in ('none', 'near', 'failure')),
  techniques text[] not null default '{}',
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Composite FK: a set can only be attached to a session of the same user.
  foreign key (session_id, user_id)
    references public.workout_sessions (id, user_id)
    on delete cascade
);

-- ---------------------------------------------------------------------------
-- Daily log, body measurements, diet phases
-- ---------------------------------------------------------------------------

create table public.daily_logs (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  weight numeric check (weight between 20 and 400),
  calories numeric check (calories >= 0),
  protein numeric check (protein >= 0),
  carbs numeric check (carbs >= 0),
  fat numeric check (fat >= 0),
  fiber numeric check (fiber >= 0),
  sodium_mg numeric check (sodium_mg >= 0),
  water_l numeric check (water_l >= 0),
  sleep_h numeric check (sleep_h between 0 and 24),
  steps integer check (steps >= 0),
  energy smallint check (energy between 1 and 5),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table public.measurements (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  waist numeric check (waist > 0),
  chest numeric check (chest > 0),
  arm_l numeric check (arm_l > 0),
  arm_r numeric check (arm_r > 0),
  thigh_l numeric check (thigh_l > 0),
  thigh_r numeric check (thigh_r > 0),
  hips numeric check (hips > 0),
  neck numeric check (neck > 0),
  body_fat numeric check (body_fat between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table public.diet_phases (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type text not null check (type in ('cut', 'maintenance', 'reverse', 'bulk')),
  start_date date not null,
  end_date date check (end_date is null or end_date >= start_date),
  kcal_training numeric check (kcal_training >= 0),
  kcal_rest numeric check (kcal_rest >= 0),
  -- Training-day macros; the *_rest columns fall back to these when null.
  protein numeric check (protein >= 0),
  carbs numeric check (carbs >= 0),
  fat numeric check (fat >= 0),
  protein_rest numeric check (protein_rest >= 0),
  carbs_rest numeric check (carbs_rest >= 0),
  fat_rest numeric check (fat_rest >= 0),
  weekly_kcal_step numeric,
  target_weekly_change_pct numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Cardio
-- ---------------------------------------------------------------------------

create table public.cardio_sessions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  type text not null,
  duration_min numeric check (duration_min >= 0),
  distance_km numeric check (distance_km >= 0),
  speed_kmh numeric check (speed_kmh >= 0),
  incline_pct numeric,
  level numeric check (level >= 0),
  watts numeric check (watts >= 0),
  avg_hr smallint check (avg_hr between 20 and 260),
  max_hr smallint check (max_hr between 20 and 260),
  kcal numeric check (kcal >= 0),
  kcal_estimated boolean not null default false,
  intensity smallint check (intensity between 1 and 10),
  -- Type-specific extras: floors, rounds, work/rest seconds …
  details jsonb not null default '{}'::jsonb,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cardio_presets (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  type text not null,
  "values" jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Supplements
-- ---------------------------------------------------------------------------

create table public.supplements (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  dose numeric check (dose >= 0),
  unit text not null default 'g'
    check (unit in ('g', 'mg', 'mcg', 'IU', 'scoop', 'capsule', 'tablet', 'ml')),
  timing text not null default 'any'
    check (timing in ('morning', 'pre_workout', 'post_workout', 'with_meal', 'evening', 'any')),
  active boolean not null default true,
  position integer not null default 0,
  daily_max numeric check (daily_max >= 0),
  caffeine_mg numeric check (caffeine_mg >= 0),
  macros jsonb,
  count_macros boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.supplement_logs (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  supplement_id uuid not null,
  dose numeric check (dose >= 0),
  "time" time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Composite FK: a log can only point at a supplement of the same user.
  foreign key (supplement_id, user_id)
    references public.supplements (id, user_id)
    on delete cascade
);

-- ---------------------------------------------------------------------------
-- Indexes. (user_id, date) also serves lookups by user_id alone; tables keyed by
-- (user_id, …) are already covered by their primary key.
-- ---------------------------------------------------------------------------

create index custom_exercises_user_idx on public.custom_exercises (user_id);
create index workout_templates_user_idx on public.workout_templates (user_id);
create index workout_sessions_user_date_idx on public.workout_sessions (user_id, date);
create index workout_sessions_template_idx on public.workout_sessions (template_id);
create index set_logs_user_date_idx on public.set_logs (user_id, date);
create index set_logs_session_idx on public.set_logs (session_id);
create index set_logs_user_exercise_idx on public.set_logs (user_id, exercise_id, date);
create index diet_phases_user_start_idx on public.diet_phases (user_id, start_date);
create index cardio_sessions_user_date_idx on public.cardio_sessions (user_id, date);
create index cardio_presets_user_idx on public.cardio_presets (user_id);
create index supplements_user_idx on public.supplements (user_id);
create index supplement_logs_user_date_idx on public.supplement_logs (user_id, date);
create index supplement_logs_supplement_idx on public.supplement_logs (supplement_id);

-- ---------------------------------------------------------------------------
-- Row Level Security, grants and updated_at triggers: identical for every table.
-- Logged-in users reach only their own rows; anonymous visitors reach nothing.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
  owner_col text;
begin
  foreach t in array array[
    'profiles', 'custom_exercises', 'exercise_settings', 'workout_templates',
    'workout_sessions', 'set_logs', 'daily_logs', 'measurements', 'diet_phases',
    'cardio_sessions', 'cardio_presets', 'supplements', 'supplement_logs'
  ]
  loop
    owner_col := case when t = 'profiles' then 'id' else 'user_id' end;

    execute format('alter table public.%I enable row level security', t);

    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = %I)',
      t || '_select_own', t, owner_col);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = %I)',
      t || '_insert_own', t, owner_col);
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = %I) with check ((select auth.uid()) = %I)',
      t || '_update_own', t, owner_col, owner_col);
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = %I)',
      t || '_delete_own', t, owner_col);

    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);

    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Account deletion: removes the caller's auth user; every table above cascades.
-- ---------------------------------------------------------------------------

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated';
  end if;

  delete from auth.users where id = (select auth.uid());
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
