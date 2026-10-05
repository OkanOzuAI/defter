import type { DateStr } from '../lib/date'
import type { SessionRow, SetRow } from '../workout/types'
import { supabase } from './supabase'

const SESSION_COLUMNS = 'id,user_id,date,name,template_id,started_at,ended_at,note,exercises'
const SET_COLUMNS =
  'id,user_id,session_id,date,exercise_id,exercise_position,superset_group,set_index,side,set_type,weight,reps,rir,failure,techniques,done'

// Rows carry client-made UUIDs, so repeating an upsert after a lost reply is harmless.

export async function upsertSessions(rows: SessionRow[]): Promise<void> {
  if (rows.length === 0) return
  const { error } = await supabase.from('workout_sessions').upsert(rows)
  if (error) throw error
}

export async function upsertSetLogs(rows: SetRow[]): Promise<void> {
  if (rows.length === 0) return
  const { error } = await supabase.from('set_logs').upsert(rows)
  if (error) throw error
}

export async function deleteSetLogs(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const { error } = await supabase.from('set_logs').delete().in('id', ids)
  if (error) throw error
}

/** Sets go with the session (on delete cascade). */
export async function deleteSessions(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const { error } = await supabase.from('workout_sessions').delete().in('id', ids)
  if (error) throw error
}

export async function listSessions(limit = 60): Promise<SessionRow[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select(SESSION_COLUMNS)
    .order('date', { ascending: false })
    .order('started_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

export async function getSession(
  id: string,
): Promise<{ session: SessionRow; sets: SetRow[] } | null> {
  const [session, sets] = await Promise.all([
    supabase.from('workout_sessions').select(SESSION_COLUMNS).eq('id', id).maybeSingle(),
    supabase
      .from('set_logs')
      .select(SET_COLUMNS)
      .eq('session_id', id)
      .order('exercise_position')
      .order('set_index')
      .order('side'),
  ])
  if (session.error) throw session.error
  if (sets.error) throw sets.error
  if (!session.data) return null
  return { session: session.data, sets: sets.data }
}

/** Completed sets of the given sessions, e.g. to count sets in the history list. */
export async function getSetsOfSessions(sessionIds: string[]): Promise<SetRow[]> {
  if (sessionIds.length === 0) return []
  const { data, error } = await supabase
    .from('set_logs')
    .select(SET_COLUMNS)
    .in('session_id', sessionIds)
    .order('exercise_position')
    .order('set_index')
    .order('side')
  if (error) throw error
  return data
}

/** Every logged set of one exercise, oldest first. */
export async function getExerciseSets(exerciseId: string): Promise<SetRow[]> {
  const { data, error } = await supabase
    .from('set_logs')
    .select(SET_COLUMNS)
    .eq('exercise_id', exerciseId)
    .order('date')
    .order('set_index')
    .order('side')
  if (error) throw error
  return data
}

/**
 * Recent sets of several exercises, newest first. Enough to find each exercise's
 * previous session without one request per exercise.
 */
export async function getRecentSets(exerciseIds: string[], before: DateStr): Promise<SetRow[]> {
  if (exerciseIds.length === 0) return []
  const { data, error } = await supabase
    .from('set_logs')
    .select(SET_COLUMNS)
    .in('exercise_id', exerciseIds)
    .lte('date', before)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(600)
  if (error) throw error
  return data
}

/** Finished sessions done from a saved workout, newest first. */
export async function getTemplateSessions(templateId: string, limit = 5): Promise<SessionRow[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select(SESSION_COLUMNS)
    .eq('template_id', templateId)
    .not('ended_at', 'is', null)
    .order('date', { ascending: false })
    .order('started_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

/** All completed sets of the given exercises up to a date, for PR detection. */
export async function getExerciseHistory(exerciseIds: string[], until: DateStr): Promise<SetRow[]> {
  if (exerciseIds.length === 0) return []
  const { data, error } = await supabase
    .from('set_logs')
    .select(SET_COLUMNS)
    .in('exercise_id', exerciseIds)
    .eq('done', true)
    .lte('date', until)
    .order('date', { ascending: false })
    .limit(5000)
  if (error) throw error
  return data
}
