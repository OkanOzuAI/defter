import type { TemplateRow } from '../workout/types'
import { supabase } from './supabase'

const COLUMNS = 'id,user_id,name,note,weekdays,items'

export async function listTemplates(): Promise<TemplateRow[]> {
  const { data, error } = await supabase.from('workout_templates').select(COLUMNS).order('name')
  if (error) throw error
  return data
}

/** Creates or replaces a saved workout (client-made id). */
export async function saveTemplate(template: TemplateRow): Promise<TemplateRow> {
  const { data, error } = await supabase
    .from('workout_templates')
    .upsert(template)
    .select(COLUMNS)
    .single()
  if (error) throw error
  return data
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('workout_templates').delete().eq('id', id)
  if (error) throw error
}
