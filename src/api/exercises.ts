import { currentUserId, supabase } from './supabase'

export type CustomExerciseRow = {
  id: string
  user_id: string
  name: string
  category: string
  equipment: string
  pattern: string | null
  primary_muscles: string[]
  secondary_muscles: string[]
  is_compound: boolean
  unilateral: boolean
  load_mode: 'total' | 'per_hand' | 'added_bodyweight'
  increment: number
  bar_weight: number | null
}

/** Per-user overrides for any exercise (library slug or custom id). */
export type ExerciseSettingRow = {
  exercise_id: string
  hidden: boolean
  increment: number | null
  bar_weight: number | null
  rest_sec: number | null
  note: string | null
}

export type ExerciseData = { custom: CustomExerciseRow[]; settings: ExerciseSettingRow[] }

export async function getExerciseData(): Promise<ExerciseData> {
  const [custom, settings] = await Promise.all([
    supabase
      .from('custom_exercises')
      .select(
        'id,user_id,name,category,equipment,pattern,primary_muscles,secondary_muscles,is_compound,unilateral,load_mode,increment,bar_weight',
      )
      .order('name'),
    supabase
      .from('exercise_settings')
      .select('exercise_id,hidden,increment,bar_weight,rest_sec,note'),
  ])
  if (custom.error) throw custom.error
  if (settings.error) throw settings.error
  return { custom: custom.data, settings: settings.data }
}

export async function saveCustomExercise(row: CustomExerciseRow): Promise<void> {
  const { error } = await supabase.from('custom_exercises').upsert(row)
  if (error) throw error
}

export async function deleteCustomExercise(id: string): Promise<void> {
  const { error } = await supabase.from('custom_exercises').delete().eq('id', id)
  if (error) throw error
}

export async function saveExerciseSetting(setting: ExerciseSettingRow): Promise<void> {
  const user_id = await currentUserId()
  const { error } = await supabase
    .from('exercise_settings')
    .upsert({ user_id, ...setting }, { onConflict: 'user_id,exercise_id' })
  if (error) throw error
}
