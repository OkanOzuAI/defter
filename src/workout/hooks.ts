import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { getDailyLogs } from '../api/dailyLogs'
import { getRecentSets } from '../api/workouts'
import { recentBodyweight } from '../lib/calc'
import { addDays, type DateStr } from '../lib/date'
import { lastSessionSets } from './history'
import { flush, loadOutbox, onFlushed } from './outbox'
import type { SetRow } from './types'

/** Query key prefix for everything that depends on stored workouts. */
export const workoutKey = (userId: string | undefined) => ['workout', userId] as const

/** Re-renders every `intervalMs` with the current time; pass null to pause. */
export function useNow(intervalMs: number | null): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (intervalMs === null) return
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}

/** Keeps the screen on while `active`, where the browser supports it. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | undefined
    let cancelled = false

    const request = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const next = await navigator.wakeLock.request('screen')
        if (cancelled) void next.release()
        else lock = next
      } catch {
        // Denied (e.g. low battery mode): nothing to do.
      }
    }
    // The lock is dropped whenever the tab is hidden, so take it again on return.
    document.addEventListener('visibilitychange', request)
    void request()

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', request)
      void lock?.release()
    }
  }, [active])
}

/** Flushes the offline queue on app start, when the connection returns, and periodically. */
export function useOutboxSync(userId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId) return
    loadOutbox(userId)
    const run = () => void flush(userId)
    const stop = onFlushed(() => {
      void queryClient.invalidateQueries({ queryKey: workoutKey(userId) })
    })
    run()
    window.addEventListener('online', run)
    const timer = setInterval(run, 20_000)
    return () => {
      stop()
      window.removeEventListener('online', run)
      clearInterval(timer)
    }
  }, [userId, queryClient])
}

/** Latest weigh-in of the last 7 days, for bodyweight-loaded lifts. */
export function useBodyweight(userId: string | undefined, date: DateStr): number | undefined {
  const { data } = useQuery({
    queryKey: ['daily-logs', userId, addDays(date, -7), date],
    queryFn: () => getDailyLogs(addDays(date, -7), date),
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
  })
  return data ? recentBodyweight(data, date) : undefined
}

const lastKey = (userId: string) => `defter.lastsets.${userId}`

function readLastCache(userId: string): Record<string, SetRow[]> {
  try {
    return JSON.parse(localStorage.getItem(lastKey(userId)) ?? '{}') as Record<string, SetRow[]>
  } catch {
    return {}
  }
}

/**
 * The user's own previous sets per exercise (history, not a prescription).
 * Kept on the device as well, so the "last time" line still shows without signal.
 */
export function useLastSets(
  userId: string | undefined,
  exerciseIds: string[],
  sessionId: string,
  date: DateStr,
): Record<string, SetRow[]> {
  const ids = [...new Set(exerciseIds)].sort()
  const cached = useMemo(() => (userId ? readLastCache(userId) : {}), [userId])
  const { data } = useQuery({
    queryKey: [...workoutKey(userId), 'last', sessionId, date, ids.join(',')],
    enabled: Boolean(userId) && ids.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const fresh = lastSessionSets(await getRecentSets(ids, date), sessionId)
      const merged = { ...readLastCache(userId!), ...fresh }
      try {
        localStorage.setItem(lastKey(userId!), JSON.stringify(merged))
      } catch {
        // cache is optional
      }
      return merged
    },
    placeholderData: (previous) => previous,
  })
  return data ?? cached
}
