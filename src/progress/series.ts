/** Turns stored rows into chart series. Pure, so the numbers behind every chart are tested. */
import type { CardioSession, DailyLog } from '../api/types'
import type { Exercise, Muscle } from '../data/exercises'
import {
  adaptiveTdee,
  CARDIO_TYPES,
  e1rm,
  hardSetsPerMuscle,
  movingAverage7,
  volumeLoad,
} from '../lib/calc'
import { addDays, dateRange, startOfWeek, type DateStr } from '../lib/date'
import type { SetRow } from '../workout/types'

export type WeightPointRow = {
  date: DateStr
  weight: number | null
  avg: number | null
  saltG: number | null
}

/** One row per day in the range, so charts that share the x-axis line up. */
export function weightSeries(logs: DailyLog[], from: DateStr, to: DateStr): WeightPointRow[] {
  const byDate = new Map(logs.map((log) => [log.date, log]))
  return dateRange(from, to).map((date) => {
    const log = byDate.get(date)
    return {
      date,
      weight: log?.weight ?? null,
      avg: movingAverage7(logs, date) ?? null,
      saltG: log?.sodium_mg == null ? null : (log.sodium_mg * 2.5) / 1000,
    }
  })
}

export function tdeeSeries(logs: DailyLog[], from: DateStr, to: DateStr) {
  return dateRange(from, to).flatMap((date) => {
    const tdee = adaptiveTdee(logs, date)
    return tdee === undefined ? [] : [{ date, tdee: Math.round(tdee) }]
  })
}

/** Mondays of the `count` weeks ending with the week of `date`, oldest first. */
export function weekStarts(date: DateStr, count: number): DateStr[] {
  const current = startOfWeek(date)
  return Array.from({ length: count }, (_, i) => addDays(current, -7 * (count - 1 - i)))
}

export type WeekNutrition = {
  week: DateStr
  days: number
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
}

/** Weekly means over the days that have a value (a week with no entries gives nulls). */
export function weeklyNutrition(logs: DailyLog[], weeks: DateStr[]): WeekNutrition[] {
  return weeks.map((week) => {
    const end = addDays(week, 6)
    const rows = logs.filter((log) => log.date >= week && log.date <= end)
    const mean = (field: 'calories' | 'protein' | 'carbs' | 'fat') => {
      const values = rows.flatMap((row) => (row[field] === null ? [] : [row[field]]))
      return values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length
    }
    return {
      week,
      days: rows.filter((row) => row.calories !== null).length,
      calories: mean('calories'),
      protein: mean('protein'),
      carbs: mean('carbs'),
      fat: mean('fat'),
    }
  })
}

type Lookup = (id: string) => Exercise

/** Hard sets per muscle for each week: `rows[muscle][weekIndex]`. Muscles never trained are left out. */
export function hardSetsByWeek(sets: SetRow[], getExercise: Lookup, weeks: DateStr[]) {
  const perWeek = weeks.map((week) => {
    const end = addDays(week, 6)
    return hardSetsPerMuscle(
      sets.filter((set) => set.date >= week && set.date <= end),
      getExercise,
    )
  })
  const muscles = [...new Set(perWeek.flatMap((week) => Object.keys(week) as Muscle[]))]
  return muscles
    .map((muscle) => ({ muscle, weeks: perWeek.map((week) => week[muscle] ?? 0) }))
    .sort((a, b) => b.weeks.at(-1)! - a.weeks.at(-1)! || a.muscle.localeCompare(b.muscle))
}

/** Left vs right volume load per unilateral exercise. */
export function sideVolumes(sets: SetRow[], getExercise: Lookup) {
  const totals = new Map<string, { left: number; right: number }>()
  for (const set of sets) {
    if (!set.side || set.set_type === 'warmup') continue
    const entry = totals.get(set.exercise_id) ?? { left: 0, right: 0 }
    const volume = (set.weight ?? 0) * (set.reps ?? 0)
    if (set.side === 'L') entry.left += volume
    else entry.right += volume
    totals.set(set.exercise_id, entry)
  }
  return [...totals.entries()]
    .map(([id, value]) => ({ id, name: getExercise(id).name, ...value }))
    .sort((a, b) => b.left + b.right - (a.left + a.right))
}

export type StrengthSession = {
  date: DateStr
  e1rm: number | null
  volume: number
  /** The set behind the best e1RM, or the heaviest set when none has an e1RM. */
  best: SetRow | undefined
}

/** One point per session of an exercise: best e1RM, volume load and the best set. */
export function strengthSessions(
  sets: SetRow[],
  exercise: Pick<Exercise, 'loadMode'>,
  bodyweightOn: (date: DateStr) => number | undefined,
): StrengthSession[] {
  const bySession = new Map<string, SetRow[]>()
  for (const set of sets) {
    if (!set.done || set.set_type === 'warmup') continue
    bySession.set(set.session_id, [...(bySession.get(set.session_id) ?? []), set])
  }
  return [...bySession.values()]
    .map((rows) => {
      const date = rows[0].date
      const bodyweight = bodyweightOn(date)
      let best: SetRow | undefined
      let bestValue: number | null = null
      for (const row of rows) {
        const value = e1rm(row, { loadMode: exercise.loadMode, bodyweight })
        if (value !== undefined && (bestValue === null || value > bestValue)) {
          bestValue = value
          best = row
        }
      }
      best ??= [...rows].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))[0]
      return { date, e1rm: bestValue, volume: volumeLoad(rows), best }
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Most reps ever done at each weight, heaviest first. */
export function repRecords(sets: SetRow[]): { weight: number; reps: number; date: DateStr }[] {
  const best = new Map<number, { reps: number; date: DateStr }>()
  for (const set of sets) {
    if (!set.done || set.set_type === 'warmup' || !set.weight || !set.reps) continue
    const current = best.get(set.weight)
    if (!current || set.reps > current.reps)
      best.set(set.weight, { reps: set.reps, date: set.date })
  }
  return [...best.entries()]
    .map(([weight, value]) => ({ weight, ...value }))
    .sort((a, b) => b.weight - a.weight)
}

export const OTHER = 'other_types'

const typeOrder = (type: string) => {
  const index = (CARDIO_TYPES as string[]).indexOf(type)
  return index === -1 ? CARDIO_TYPES.length : index
}

/**
 * Weekly cardio minutes by type. At most `maxSeries` types get their own series
 * (the ones with the most minutes overall); the rest are folded into one.
 */
export function cardioWeekly(sessions: CardioSession[], weeks: DateStr[], maxSeries = 4) {
  const totals = new Map<string, number>()
  for (const session of sessions) {
    totals.set(session.type, (totals.get(session.type) ?? 0) + (session.duration_min ?? 0))
  }
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([type]) => type)
  const fold = ranked.length > maxSeries
  // Shown in the app's fixed type order, so a type keeps its place in the stack
  // from week to week instead of moving with its rank.
  const shown = (fold ? ranked.slice(0, maxSeries - 1) : ranked).sort(
    (a, b) => typeOrder(a) - typeOrder(b),
  )
  const types = fold ? [...shown, OTHER] : shown

  const rows = weeks.map((week) => {
    const end = addDays(week, 6)
    const row: Record<string, number | string> = { week }
    for (const type of types) row[type] = 0
    for (const session of sessions) {
      if (session.date < week || session.date > end) continue
      const key = types.includes(session.type) ? session.type : OTHER
      row[key] = (row[key] as number) + (session.duration_min ?? 0)
    }
    return row
  })
  return { types, rows }
}
