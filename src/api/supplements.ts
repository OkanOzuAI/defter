import { SUPPLEMENT_SEED } from '../data/supplementSeed'
import type { Lang } from '../i18n'
import type { DateStr } from '../lib/date'
import { currentUserId, supabase } from './supabase'
import type { Supplement, SupplementLog } from './types'

/** Copies the starter list into the user's own supplements. Does nothing if they have any. */
export async function seedSupplements(lang: Lang): Promise<void> {
  const user_id = await currentUserId()

  const { count, error: countError } = await supabase
    .from('supplements')
    .select('id', { count: 'exact', head: true })
  if (countError) throw countError
  if (count) return

  const rows = SUPPLEMENT_SEED.map((seed, position) => ({
    id: crypto.randomUUID(),
    user_id,
    name: seed.name[lang],
    dose: seed.dose,
    unit: seed.unit,
    timing: seed.timing,
    active: seed.active,
    position,
    caffeine_mg: seed.caffeineMg ?? null,
  }))
  const { error } = await supabase.from('supplements').insert(rows)
  if (error) throw error
}

const COLUMNS =
  'id,user_id,name,dose,unit,timing,active,position,daily_max,caffeine_mg,macros,count_macros'
const LOG_COLUMNS = 'id,user_id,date,supplement_id,dose,time'

export async function listSupplements(): Promise<Supplement[]> {
  const { data, error } = await supabase
    .from('supplements')
    .select(COLUMNS)
    .order('position')
    .order('name')
  if (error) throw error
  return data
}

export async function saveSupplements(rows: Supplement[]): Promise<void> {
  if (rows.length === 0) return
  const { error } = await supabase.from('supplements').upsert(rows)
  if (error) throw error
}

/** Its logs go with it (on delete cascade). */
export async function deleteSupplement(id: string): Promise<void> {
  const { error } = await supabase.from('supplements').delete().eq('id', id)
  if (error) throw error
}

export async function getSupplementLogs(from: DateStr, to: DateStr): Promise<SupplementLog[]> {
  const { data, error } = await supabase
    .from('supplement_logs')
    .select(LOG_COLUMNS)
    .gte('date', from)
    .lte('date', to)
    .order('date')
    .order('time')
  if (error) throw error
  return data
}

export async function saveSupplementLog(log: SupplementLog): Promise<void> {
  const { error } = await supabase.from('supplement_logs').upsert(log)
  if (error) throw error
}

export async function deleteSupplementLog(id: string): Promise<void> {
  const { error } = await supabase.from('supplement_logs').delete().eq('id', id)
  if (error) throw error
}
