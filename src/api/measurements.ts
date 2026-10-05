import type { DateStr } from '../lib/date'
import { currentUserId, supabase } from './supabase'

export const MEASUREMENT_FIELDS = [
  'waist',
  'chest',
  'arm_l',
  'arm_r',
  'thigh_l',
  'thigh_r',
  'hips',
  'neck',
  'body_fat',
] as const
export type MeasurementField = (typeof MEASUREMENT_FIELDS)[number]

export type Measurement = { date: DateStr } & Record<MeasurementField, number | null>

export async function listMeasurements(): Promise<Measurement[]> {
  const { data, error } = await supabase
    .from('measurements')
    .select(`date,${MEASUREMENT_FIELDS.join(',')}`)
    .order('date')
  if (error) throw error
  return data as unknown as Measurement[]
}

export async function saveMeasurement(measurement: Measurement): Promise<void> {
  const user_id = await currentUserId()
  const { error } = await supabase
    .from('measurements')
    .upsert({ user_id, ...measurement }, { onConflict: 'user_id,date' })
  if (error) throw error
}

export async function deleteMeasurement(date: DateStr): Promise<void> {
  const user_id = await currentUserId()
  const { error } = await supabase.from('measurements').delete().match({ user_id, date })
  if (error) throw error
}
