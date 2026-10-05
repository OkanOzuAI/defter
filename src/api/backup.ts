import { currentUserId, supabase } from './supabase'

/** Every user table except the profile, parents before the rows that reference them. */
const TABLES = [
  { name: 'custom_exercises', conflict: 'id' },
  { name: 'exercise_settings', conflict: 'user_id,exercise_id' },
  { name: 'workout_templates', conflict: 'id' },
  { name: 'workout_sessions', conflict: 'id' },
  { name: 'set_logs', conflict: 'id' },
  { name: 'daily_logs', conflict: 'user_id,date' },
  { name: 'measurements', conflict: 'user_id,date' },
  { name: 'diet_phases', conflict: 'id' },
  { name: 'cardio_sessions', conflict: 'id' },
  { name: 'cardio_presets', conflict: 'id' },
  { name: 'supplements', conflict: 'id' },
  { name: 'supplement_logs', conflict: 'id' },
] as const

export type TableName = (typeof TABLES)[number]['name']
type Row = Record<string, unknown>

export type Backup = {
  app: 'defter'
  version: 1
  exported_at: string
  profile: Row | null
  tables: Record<TableName, Row[]>
}

const PAGE = 1000

/** All of the user's rows in one table. RLS already limits the read to their own. */
export async function fetchAll(table: TableName): Promise<Row[]> {
  const rows: Row[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('created_at')
      .range(from, from + PAGE - 1)
    if (error) throw error
    rows.push(...data)
    if (data.length < PAGE) return rows
  }
}

export async function exportAll(): Promise<Backup> {
  const id = await currentUserId()
  const profile = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()
  if (profile.error) throw profile.error

  const tables = {} as Record<TableName, Row[]>
  for (const { name } of TABLES) tables[name] = await fetchAll(name)
  return {
    app: 'defter',
    version: 1,
    exported_at: new Date().toISOString(),
    profile: profile.data,
    tables,
  }
}

export function parseBackup(text: string): Backup {
  const data = JSON.parse(text) as Partial<Backup>
  if (data?.app !== 'defter' || data.version !== 1 || typeof data.tables !== 'object') {
    throw new Error('Not a Defter export')
  }
  return data as Backup
}

export function countRows(backup: Backup): number {
  return TABLES.reduce((sum, { name }) => sum + (backup.tables[name]?.length ?? 0), 0)
}

/**
 * Merges an export into the signed-in account: rows with the same id (or the same
 * day, for daily logs and measurements) are replaced by the file's version, everything
 * else is added, nothing is deleted. Every row is re-owned by the current user; the
 * profile itself is left as it is.
 */
export async function importAll(backup: Backup): Promise<number> {
  const user_id = await currentUserId()
  let written = 0
  for (const { name, conflict } of TABLES) {
    const rows = (backup.tables[name] ?? []).map((row) => {
      const copy: Row = { ...row, user_id }
      delete copy.created_at
      delete copy.updated_at
      return copy
    })
    for (let from = 0; from < rows.length; from += 500) {
      const chunk = rows.slice(from, from + 500)
      const { error } = await supabase.from(name).upsert(chunk, { onConflict: conflict })
      if (error) throw error
      written += chunk.length
    }
  }
  return written
}
