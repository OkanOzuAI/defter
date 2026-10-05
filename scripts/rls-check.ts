/**
 * Proves that Row Level Security isolates users: user A creates one row in every table,
 * then user B tries to read, change, delete and forge them. Run with `npm run rls-check`.
 *
 * Needs two throwaway accounts you created yourself (Supabase → Authentication → Users →
 * Add user), with their credentials in .env.local as RLS_USER_A_EMAIL / RLS_USER_A_PASSWORD /
 * RLS_USER_B_EMAIL / RLS_USER_B_PASSWORD. Only the anon key is used; nothing is committed.
 * All test rows are removed again at the end.
 */
import { randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const env = (name: string): string => {
  const value = process.env[name]
  if (!value) {
    console.error(`Missing ${name} in .env.local`)
    process.exit(2)
  }
  return value
}

const url = env('VITE_SUPABASE_URL')
const anonKey = env('VITE_SUPABASE_ANON_KEY')

const newClient = () =>
  createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })

async function signIn(label: string): Promise<{ client: SupabaseClient; id: string }> {
  const client = newClient()
  const { data, error } = await client.auth.signInWithPassword({
    email: env(`RLS_USER_${label}_EMAIL`),
    password: env(`RLS_USER_${label}_PASSWORD`),
  })
  if (error || !data.user) {
    console.error(`Could not sign in user ${label}: ${error?.message}`)
    process.exit(2)
  }
  return { client, id: data.user.id }
}

let failures = 0
function check(ok: boolean, label: string) {
  if (!ok) failures += 1
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}`)
}

const a = await signIn('A')
const b = await signIn('B')
if (a.id === b.id) {
  console.error('RLS_USER_A and RLS_USER_B must be two different accounts.')
  process.exit(2)
}

// A date nobody logs on, so real data of the test accounts is never touched.
const DATE = '1999-01-01'
const ids = {
  exercise: randomUUID(),
  template: randomUUID(),
  session: randomUUID(),
  set: randomUUID(),
  phase: randomUUID(),
  cardio: randomUUID(),
  preset: randomUUID(),
  supplement: randomUUID(),
  supplementLog: randomUUID(),
}

type Filter = Record<string, string>
type Row = { table: string; values: Record<string, unknown>; match: Filter }

// Parents first: sets need the session, supplement logs need the supplement.
const rows: Row[] = [
  {
    table: 'custom_exercises',
    values: { id: ids.exercise, name: 'rls-check', category: 'chest', equipment: 'machine' },
    match: { id: ids.exercise },
  },
  {
    table: 'exercise_settings',
    values: { exercise_id: 'rls-check' },
    match: { user_id: a.id, exercise_id: 'rls-check' },
  },
  {
    table: 'workout_templates',
    values: { id: ids.template, name: 'rls-check' },
    match: { id: ids.template },
  },
  {
    table: 'workout_sessions',
    values: { id: ids.session, date: DATE, template_id: ids.template },
    match: { id: ids.session },
  },
  {
    table: 'set_logs',
    values: { id: ids.set, session_id: ids.session, date: DATE, exercise_id: 'rls-check' },
    match: { id: ids.set },
  },
  { table: 'daily_logs', values: { date: DATE, weight: 80 }, match: { user_id: a.id, date: DATE } },
  {
    table: 'measurements',
    values: { date: DATE, waist: 80 },
    match: { user_id: a.id, date: DATE },
  },
  {
    table: 'diet_phases',
    values: { id: ids.phase, type: 'maintenance', start_date: DATE },
    match: { id: ids.phase },
  },
  {
    table: 'cardio_sessions',
    values: { id: ids.cardio, date: DATE, type: 'walk' },
    match: { id: ids.cardio },
  },
  {
    table: 'cardio_presets',
    values: { id: ids.preset, name: 'rls-check', type: 'walk' },
    match: { id: ids.preset },
  },
  {
    table: 'supplements',
    values: { id: ids.supplement, name: 'rls-check' },
    match: { id: ids.supplement },
  },
  {
    table: 'supplement_logs',
    values: { id: ids.supplementLog, date: DATE, supplement_id: ids.supplement },
    match: { id: ids.supplementLog },
  },
]

// The profile is the one row per user, so reuse A's real one if onboarding was done.
const existingProfile = await a.client.from('profiles').select('id').eq('id', a.id).maybeSingle()
const createdProfile = !existingProfile.data
if (createdProfile) {
  const { error } = await a.client.from('profiles').insert({
    id: a.id,
    username: `rls_${a.id.replace(/-/g, '').slice(0, 12)}`,
    display_name: 'rls-check',
  })
  if (error) {
    console.error(`Could not create a profile for user A: ${error.message}`)
    process.exit(2)
  }
}
const profileRow: Row = { table: 'profiles', values: {}, match: { id: a.id } }

async function cleanup() {
  for (const row of [...rows].reverse()) {
    await a.client.from(row.table).delete().match(row.match)
  }
  if (createdProfile) await a.client.from('profiles').delete().eq('id', a.id)
}

try {
  console.log('\nUser A creates one row per table')
  for (const row of rows) {
    const { error } = await a.client.from(row.table).insert({ user_id: a.id, ...row.values })
    check(!error, `${row.table}: A can insert${error ? ` (${error.message})` : ''}`)
  }

  console.log('\nUser B tries to reach them')
  for (const row of [profileRow, ...rows]) {
    const { table, match } = row
    const owner = table === 'profiles' ? 'id' : 'user_id'

    const read = await b.client.from(table).select('*').match(match)
    check(!read.error && read.data.length === 0, `${table}: B cannot select`)

    const readAll = await b.client.from(table).select(owner).eq(owner, a.id)
    check(!readAll.error && readAll.data.length === 0, `${table}: B sees none of A's rows`)

    const update = await b.client
      .from(table)
      .update({ updated_at: '2000-01-01T00:00:00Z' })
      .match(match)
      .select()
    check((update.data ?? []).length === 0, `${table}: B cannot update`)

    const remove = await b.client.from(table).delete().match(match).select()
    check((remove.data ?? []).length === 0, `${table}: B cannot delete`)

    const still = await a.client.from(table).select('*').match(match)
    check(!still.error && still.data.length === 1, `${table}: A's row is still there`)

    // B writing a row that claims to belong to A must be rejected outright.
    if (table !== 'profiles') {
      const forged: Record<string, unknown> = { ...row.values, user_id: a.id }
      if ('id' in forged) forged.id = randomUUID()
      if ('date' in forged) forged.date = '1999-01-02'
      if (table === 'exercise_settings') forged.exercise_id = 'rls-forged'
      const forge = await b.client.from(table).insert(forged)
      check(Boolean(forge.error), `${table}: B cannot insert a row owned by A`)
    }
  }

  console.log('\nCross-user references')
  const attach = await b.client.from('set_logs').insert({
    id: randomUUID(),
    user_id: b.id,
    session_id: ids.session,
    date: DATE,
    exercise_id: 'rls-check',
  })
  check(Boolean(attach.error), "set_logs: B cannot attach a set to A's session")

  console.log('\nSigned-out visitor')
  const anon = newClient()
  for (const { table } of [profileRow, ...rows]) {
    const { data, error } = await anon.from(table).select('*').limit(1)
    check(Boolean(error) || (data ?? []).length === 0, `${table}: anonymous read returns nothing`)
  }
  const anonDelete = await anon.rpc('delete_my_account')
  check(Boolean(anonDelete.error), 'delete_my_account: not callable when signed out')
} finally {
  await cleanup()
  await Promise.all([a.client.auth.signOut(), b.client.auth.signOut()])
}

console.log(failures === 0 ? '\nAll RLS checks passed.' : `\n${failures} RLS check(s) FAILED.`)
process.exit(failures === 0 ? 0 : 1)
