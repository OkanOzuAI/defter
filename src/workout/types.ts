import type { Failure, SetType } from '../lib/calc'
import type { DateStr } from '../lib/date'

export type Side = 'L' | 'R' | null

export const SET_TYPES: SetType[] = ['warmup', 'working', 'top', 'backoff', 'drop']

export const TECHNIQUES = [
  'rest_pause',
  'myo_reps',
  'partials',
  'forced_reps',
  'negatives',
  'paused_reps',
  'cheat_reps',
] as const
export type Technique = (typeof TECHNIQUES)[number]

/** One set while it is being typed: weight and reps stay strings so "82," survives. */
export type DraftSet = {
  id: string
  set_index: number
  side: Side
  set_type: SetType
  weight: string
  reps: string
  rir: number | null
  failure: Failure
  techniques: Technique[]
  done: boolean
}

export type DraftExercise = {
  /** Stable key for this slot; the exercise in it can be swapped. */
  key: string
  exercise_id: string
  superset_group: string | null
  note: string
  tempo: string
  sets: DraftSet[]
}

export type RestState = { endsAt: number; totalSec: number }

/** The session being logged. Lives in localStorage and is rewritten on every input. */
export type Draft = {
  id: string
  date: DateStr
  name: string
  template_id: string | null
  started_at: string
  ended_at: string | null
  note: string
  exercises: DraftExercise[]
  rest: RestState | null
  /** True when an already saved session is being edited: synced on save, not live. */
  editing: boolean
  /** Set ids the session had on the server when editing started. */
  originalSetIds: string[]
}

// --- Rows as stored in Supabase ---------------------------------------------

export type SessionExercise = {
  exercise_id: string
  position: number
  superset_group: string | null
  note: string
  tempo: string
}

export type SessionRow = {
  id: string
  user_id: string
  date: DateStr
  name: string | null
  template_id: string | null
  started_at: string | null
  ended_at: string | null
  note: string | null
  exercises: SessionExercise[]
}

export type SetRow = {
  id: string
  user_id: string
  session_id: string
  date: DateStr
  exercise_id: string
  exercise_position: number
  superset_group: string | null
  set_index: number
  side: Side
  set_type: SetType
  weight: number | null
  reps: number | null
  rir: number | null
  failure: Failure
  techniques: string[]
  done: boolean
}
