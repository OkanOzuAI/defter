import { supabase } from './supabase'
import type { DietPhase } from './types'

const COLUMNS =
  'id,user_id,type,start_date,end_date,kcal_training,kcal_rest,protein,carbs,fat,protein_rest,carbs_rest,fat_rest,weekly_kcal_step,target_weekly_change_pct'

export async function listDietPhases(): Promise<DietPhase[]> {
  const { data, error } = await supabase
    .from('diet_phases')
    .select(COLUMNS)
    .order('start_date', { ascending: false })
  if (error) throw error
  return data
}

export async function saveDietPhase(phase: DietPhase): Promise<void> {
  const { error } = await supabase.from('diet_phases').upsert(phase)
  if (error) throw error
}

export async function deleteDietPhase(id: string): Promise<void> {
  const { error } = await supabase.from('diet_phases').delete().eq('id', id)
  if (error) throw error
}
