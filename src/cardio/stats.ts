import type { CardioSession, DailyLog } from '../api/types'
import { addDays, dateRange, type DateStr } from '../lib/date'

type StepLog = Pick<DailyLog, 'date' | 'steps'>

/** Mean steps over the logged days among the 7 ending on `date`. */
export function stepsAverage7(logs: StepLog[], date: DateStr): number | undefined {
  const from = addDays(date, -6)
  const window = logs.filter((log) => log.steps !== null && log.date >= from && log.date <= date)
  if (window.length === 0) return undefined
  return window.reduce((sum, log) => sum + (log.steps ?? 0), 0) / window.length
}

/** Consecutive days at or above the goal. Today not reaching it yet does not break the run. */
export function goalStreak(logs: StepLog[], goal: number | null | undefined, today: DateStr) {
  if (!goal) return 0
  const hit = new Set(logs.filter((log) => (log.steps ?? 0) >= goal).map((log) => log.date))
  let streak = 0
  let cursor = hit.has(today) ? today : addDays(today, -1)
  while (hit.has(cursor)) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

/** One bar per day for the 7 days ending on `date`; days without an entry are 0. */
export function stepsByDay(logs: StepLog[], date: DateStr): { date: DateStr; steps: number }[] {
  const byDate = new Map(logs.map((log) => [log.date, log.steps ?? 0]))
  return dateRange(addDays(date, -6), date).map((day) => ({
    date: day,
    steps: byDate.get(day) ?? 0,
  }))
}

export type WeekSummary = {
  minutes: number
  distanceKm: number
  kcal: number
  /** True when part of the kcal total is an estimate. */
  kcalEstimated: boolean
  minutesByType: { type: string; minutes: number }[]
  stepsAverage: number | undefined
}

/** Totals for the 7 days starting at `weekStart` (a Monday). */
export function weekSummary(
  sessions: CardioSession[],
  logs: StepLog[],
  weekStart: DateStr,
): WeekSummary {
  const weekEnd = addDays(weekStart, 6)
  const inWeek = <T extends { date: DateStr }>(row: T) =>
    row.date >= weekStart && row.date <= weekEnd
  const week = sessions.filter(inWeek)

  const byType = new Map<string, number>()
  for (const session of week) {
    byType.set(session.type, (byType.get(session.type) ?? 0) + (session.duration_min ?? 0))
  }
  const steps = logs.filter(inWeek).filter((log) => log.steps !== null)

  return {
    minutes: week.reduce((sum, s) => sum + (s.duration_min ?? 0), 0),
    distanceKm: week.reduce((sum, s) => sum + (s.distance_km ?? 0), 0),
    kcal: week.reduce((sum, s) => sum + (s.kcal ?? 0), 0),
    kcalEstimated: week.some((s) => s.kcal_estimated),
    minutesByType: [...byType.entries()]
      .map(([type, minutes]) => ({ type, minutes }))
      .sort((a, b) => b.minutes - a.minutes),
    stepsAverage:
      steps.length === 0
        ? undefined
        : steps.reduce((sum, log) => sum + (log.steps ?? 0), 0) / steps.length,
  }
}
