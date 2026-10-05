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

export type CardioPreset = {
  id: string
  user_id: string
  name: string
  type: string
  /** The form fields as typed, so a preset fills the form exactly as it was saved. */
  values: Record<string, string>
}

export async function listCardioPresets(): Promise<CardioPreset[]> {
  const { data, error } = await supabase
    .from('cardio_presets')
    .select('id,user_id,name,type,values')
    .order('name')
  if (error) throw error
  return data
}

export async function saveCardioPreset(preset: CardioPreset): Promise<void> {
  const { error } = await supabase.from('cardio_presets').upsert(preset)
  if (error) throw error
}

export async function deleteCardioPreset(id: string): Promise<void> {
  const { error } = await supabase.from('cardio_presets').delete().eq('id', id)
  if (error) throw error
}
