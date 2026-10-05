import { useQuery } from '@tanstack/react-query'
import { getCardioSessions } from '../api/cardio'
import { getDailyLogs } from '../api/dailyLogs'
import { listDietPhases } from '../api/dietPhases'
import { getSupplementLogs, listSupplements } from '../api/supplements'
import { getSessionDates } from '../api/workouts'
import type { DateStr } from '../lib/date'
import { useDraft } from '../workout/draftStore'

// Key prefixes: invalidating a prefix refreshes every range that was loaded.
export const dailyKey = (userId: string | undefined) => ['daily-logs', userId] as const
export const phasesKey = (userId: string | undefined) => ['diet-phases', userId] as const
export const supplementsKey = (userId: string | undefined) => ['supplements', userId] as const
export const supplementLogsKey = (userId: string | undefined) =>
  ['supplement-logs', userId] as const
export const cardioKey = (userId: string | undefined) => ['cardio', userId] as const

export function useDailyLogs(userId: string | undefined, from: DateStr, to: DateStr) {
  return useQuery({
    queryKey: [...dailyKey(userId), from, to],
    queryFn: () => getDailyLogs(from, to),
    enabled: Boolean(userId),
  })
}

export function useDietPhases(userId: string | undefined) {
  return useQuery({
    queryKey: phasesKey(userId),
    queryFn: listDietPhases,
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
  })
}

export function useSupplements(userId: string | undefined) {
  return useQuery({
    queryKey: supplementsKey(userId),
    queryFn: listSupplements,
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
  })
}

export function useSupplementLogs(userId: string | undefined, from: DateStr, to: DateStr) {
  return useQuery({
    queryKey: [...supplementLogsKey(userId), from, to],
    queryFn: () => getSupplementLogs(from, to),
    enabled: Boolean(userId),
  })
}

export function useCardioSessions(userId: string | undefined, from: DateStr, to: DateStr) {
  return useQuery({
    queryKey: [...cardioKey(userId), from, to],
    queryFn: () => getCardioSessions(from, to),
    enabled: Boolean(userId),
  })
}

/** Dates with a workout: saved sessions plus the one being logged right now. */
export function useTrainingDates(userId: string | undefined, from: DateStr, to: DateStr) {
  const draft = useDraft(userId)
  const { data } = useQuery({
    queryKey: ['workout', userId, 'dates', from, to],
    queryFn: () => getSessionDates(from, to),
    enabled: Boolean(userId),
  })
  const dates = new Set(data ?? [])
  if (draft && !draft.editing) dates.add(draft.date)
  return dates
}
