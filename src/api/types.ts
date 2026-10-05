import type { Lang } from '../i18n'
import type { DateStr } from '../lib/date'
import type { Theme } from '../lib/theme'

export type Sex = 'male' | 'female'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very' | 'extra'

export type Profile = {
  id: string
  username: string
  display_name: string
  language: Lang
  height_cm: number | null
  birth_year: number | null
  sex: Sex | null
  goal_weight: number | null
  activity_level: ActivityLevel | null
  timezone: string
  intensity_display: 'rir' | 'rpe'
  speed_unit: 'kmh' | 'mph'
  theme: Theme
  step_goal: number | null
  sodium_target_mg: number | null
  water_target_l: number | null
  sleep_target_h: number | null
  fiber_target_g: number | null
  rest_compound_sec: number
  rest_isolation_sec: number
}

export type NewProfile = Pick<
  Profile,
  | 'username'
  | 'display_name'
  | 'language'
  | 'height_cm'
  | 'birth_year'
  | 'sex'
  | 'goal_weight'
  | 'activity_level'
  | 'timezone'
>

export type DailyLog = {
  date: DateStr
  weight: number | null
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  fiber: number | null
  sodium_mg: number | null
  water_l: number | null
  sleep_h: number | null
  steps: number | null
  energy: number | null
  note: string | null
}

export type SupplementUnit = 'g' | 'mg' | 'mcg' | 'IU' | 'scoop' | 'capsule' | 'tablet' | 'ml'
export type SupplementTiming =
  'morning' | 'pre_workout' | 'post_workout' | 'with_meal' | 'evening' | 'any'

export const SUPPLEMENT_UNITS: SupplementUnit[] = [
  'g',
  'mg',
  'mcg',
  'IU',
  'scoop',
  'capsule',
  'tablet',
  'ml',
]
export const SUPPLEMENT_TIMINGS: SupplementTiming[] = [
  'morning',
  'pre_workout',
  'post_workout',
  'with_meal',
  'evening',
  'any',
]

export type Macros = { kcal?: number; protein?: number; carbs?: number; fat?: number }

export type Supplement = {
  id: string
  user_id: string
  name: string
  dose: number | null
  unit: SupplementUnit
  timing: SupplementTiming
  active: boolean
  position: number
  daily_max: number | null
  caffeine_mg: number | null
  /** Per default serving (the `dose` above). */
  macros: Macros | null
  count_macros: boolean
}

export type SupplementLog = {
  id: string
  user_id: string
  date: DateStr
  supplement_id: string
  dose: number | null
  /** "HH:MM" or "HH:MM:SS", local time. */
  time: string | null
}

export type DietPhaseType = 'cut' | 'maintenance' | 'reverse' | 'bulk'

export type DietPhase = {
  id: string
  user_id: string
  type: DietPhaseType
  start_date: DateStr
  end_date: DateStr | null
  kcal_training: number | null
  kcal_rest: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  protein_rest: number | null
  carbs_rest: number | null
  fat_rest: number | null
  weekly_kcal_step: number | null
  target_weekly_change_pct: number | null
}

export type CardioSession = {
  id: string
  user_id: string
  date: DateStr
  type: string
  duration_min: number | null
  distance_km: number | null
  speed_kmh: number | null
  incline_pct: number | null
  level: number | null
  watts: number | null
  avg_hr: number | null
  max_hr: number | null
  kcal: number | null
  kcal_estimated: boolean
  intensity: number | null
  details: Record<string, number>
  note: string | null
}
