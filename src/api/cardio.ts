import type { DateStr } from '../lib/date'
import { supabase } from './supabase'
import type { CardioSession } from './types'

const COLUMNS =
  'id,user_id,date,type,duration_min,distance_km,speed_kmh,incline_pct,level,watts,avg_hr,max_hr,kcal,kcal_estimated,intensity,details,note'

export async function getCardioSessions(from: DateStr, to: DateStr): Promise<CardioSession[]> {
  const { data, error } = await supabase
    .from('cardio_sessions')
    .select(COLUMNS)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function saveCardioSession(session: CardioSession): Promise<void> {
  const { error } = await supabase.from('cardio_sessions').upsert(session)
  if (error) throw error
}

export async function deleteCardioSession(id: string): Promise<void> {
  const { error } = await supabase.from('cardio_sessions').delete().eq('id', id)
  if (error) throw error
}
