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
