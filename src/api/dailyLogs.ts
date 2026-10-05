import type { DateStr } from '../lib/date'
import { currentUserId, supabase } from './supabase'
import type { DailyLog } from './types'

/** Creates the day's log or updates only the given fields. */
export async function saveDailyLog(
  date: DateStr,
  patch: Partial<Omit<DailyLog, 'date'>>,
): Promise<void> {
  const user_id = await currentUserId()
  const { error } = await supabase
    .from('daily_logs')
    .upsert({ user_id, date, ...patch }, { onConflict: 'user_id,date' })
  if (error) throw error
}

const COLUMNS =
  'date,weight,calories,protein,carbs,fat,fiber,sodium_mg,water_l,sleep_h,steps,energy,note'

/** Daily logs between two dates (inclusive), oldest first. */
export async function getDailyLogs(from: DateStr, to: DateStr): Promise<DailyLog[]> {
  const { data, error } = await supabase
    .from('daily_logs')
    .select(COLUMNS)
    .gte('date', from)
    .lte('date', to)
    .order('date')
  if (error) throw error
  return data
}
