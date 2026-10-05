import { describe, expect, it } from 'vitest'
import type { CardioSession, DailyLog } from '../api/types'
import { getLibraryExercise } from '../data/exercises'
import { addDays } from '../lib/date'
import { resolveExercise } from '../workout/exercises'
import type { SetRow } from '../workout/types'
import {
  cardioWeekly,
  hardSetsByWeek,
  OTHER,
  repRecords,
  sideVolumes,
  strengthSessions,
  tdeeSeries,
  weeklyNutrition,
  weekStarts,
  weightSeries,
} from './series'

const log = (date: string, over: Partial<DailyLog>): DailyLog => ({
  date,
  weight: null,
  calories: null,
  protein: null,
  carbs: null,
  fat: null,
  fiber: null,
  sodium_mg: null,
  water_l: null,
  sleep_h: null,
  steps: null,
  energy: null,
  note: null,
  ...over,
})

const set = (over: Partial<SetRow>): SetRow => ({
  id: crypto.randomUUID(),
  user_id: 'u',
  session_id: 's1',
  date: '2026-10-05',
  exercise_id: 'barbell-flat-bench-press',
  exercise_position: 0,
  superset_group: null,
  set_index: 0,
  side: null,
  set_type: 'working',
  weight: 80,
  reps: 8,
  rir: 2,
  failure: 'none',
  techniques: [],
  done: true,
  ...over,
})

describe('weight and energy series', () => {
  const logs = Array.from({ length: 21 }, (_, i) =>
    log(addDays('2026-09-16', i), {
      weight: 80,
      calories: 2500,
      sodium_mg: i === 20 ? 2000 : null,
    }),
  )

  it('has one row per day with weight, 7-day average and salt in grams', () => {
    const series = weightSeries(logs, '2026-10-04', '2026-10-07')
    expect(series.map((row) => row.date)).toEqual([
      '2026-10-04',
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
    ])
    expect(series[2]).toEqual({ date: '2026-10-06', weight: 80, avg: 80, saltG: 5 })
    expect(series[3]).toMatchObject({ weight: null, avg: 80, saltG: null })
  })

  it('only has TDEE points where there is enough data', () => {
    const series = tdeeSeries(logs, '2026-09-20', '2026-10-06')
    expect(series[0]).toEqual({ date: '2026-09-29', tdee: 2500 }) // 14th complete day
    expect(series.at(-1)).toEqual({ date: '2026-10-06', tdee: 2500 })
  })

  it('lists Mondays oldest first', () => {
    expect(weekStarts('2026-10-06', 3)).toEqual(['2026-09-21', '2026-09-28', '2026-10-05'])
  })

  it('averages nutrition per week over logged days', () => {
    const weeks = weeklyNutrition(
      [
        log('2026-09-28', { calories: 2400, protein: 180 }),
        log('2026-09-30', { calories: 2600, protein: 200 }),
        log('2026-10-01', { weight: 80 }),
      ],
      ['2026-09-28', '2026-10-05'],
    )
    expect(weeks[0]).toMatchObject({ days: 2, calories: 2500, protein: 190, carbs: null })
    expect(weeks[1]).toMatchObject({ days: 0, calories: null })
  })
})

describe('training series', () => {
  it('counts hard sets per muscle per week', () => {
    const rows = hardSetsByWeek(
      [
        set({ date: '2026-09-29' }),
        set({ date: '2026-10-05' }),
        set({ date: '2026-10-06', rir: 0 }),
        set({ date: '2026-10-06', rir: 6 }),
        set({ date: '2026-10-06', exercise_id: 'pec-deck', failure: 'near', rir: null }),
      ],
      resolveExercise,
      ['2026-09-28', '2026-10-05'],
    )
    expect(rows[0]).toEqual({ muscle: 'chest', weeks: [1, 3] })
    expect(rows.find((row) => row.muscle === 'triceps')).toEqual({
      muscle: 'triceps',
      weeks: [0.5, 1],
    })
    expect(rows.find((row) => row.muscle === 'front_delts')?.weeks).toEqual([0.5, 1.5])
  })

  it('compares left and right volume', () => {
    const volumes = sideVolumes(
      [
        set({ exercise_id: 'single-arm-pec-deck', side: 'L', weight: 40, reps: 12 }),
        set({ exercise_id: 'single-arm-pec-deck', side: 'L', weight: 40, reps: 10 }),
        set({ exercise_id: 'single-arm-pec-deck', side: 'R', weight: 40, reps: 12 }),
        set({
          exercise_id: 'single-arm-pec-deck',
          side: 'R',
          weight: 20,
          reps: 15,
          set_type: 'warmup',
        }),
        set({}),
      ],
      resolveExercise,
    )
    expect(volumes).toEqual([
      { id: 'single-arm-pec-deck', name: 'Single-Arm Pec Deck', left: 880, right: 480 },
    ])
  })

  it('summarises each session of an exercise', () => {
    const bench = getLibraryExercise('barbell-flat-bench-press')!
    const sessions = strengthSessions(
      [
        set({ session_id: 'b', date: '2026-10-06', weight: 82.5, reps: 8, rir: 2 }),
        set({ session_id: 'a', date: '2026-09-29', weight: 80, reps: 8, rir: 2 }),
        set({ session_id: 'a', date: '2026-09-29', weight: 85, reps: 3, rir: null }),
        set({ session_id: 'a', date: '2026-09-29', weight: 40, reps: 10, set_type: 'warmup' }),
      ],
      bench,
      () => undefined,
    )
    expect(sessions.map((s) => s.date)).toEqual(['2026-09-29', '2026-10-06'])
    expect(sessions[0].e1rm).toBeCloseTo(80 * (1 + 10 / 30), 6)
    expect(sessions[0].volume).toBe(80 * 8 + 85 * 3)
    expect(sessions[0].best?.weight).toBe(80)
    expect(sessions[1].e1rm).toBeCloseTo(110, 6)
  })

  it('falls back to the heaviest set when no set has an e1RM', () => {
    const [session] = strengthSessions(
      [set({ rir: null, weight: 60 }), set({ rir: null, weight: 70 })],
      { loadMode: 'total' },
      () => undefined,
    )
    expect(session.e1rm).toBeNull()
    expect(session.best?.weight).toBe(70)
  })

  it('keeps the most reps at each weight', () => {
    expect(
      repRecords([
        set({ weight: 80, reps: 8, date: '2026-09-01' }),
        set({ weight: 80, reps: 9, date: '2026-10-01' }),
        set({ weight: 85, reps: 5, date: '2026-09-15' }),
        set({ weight: 100, reps: 3, set_type: 'warmup' }),
      ]),
    ).toEqual([
      { weight: 85, reps: 5, date: '2026-09-15' },
      { weight: 80, reps: 9, date: '2026-10-01' },
    ])
  })
})

describe('cardio series', () => {
  const session = (date: string, type: string, duration_min: number) =>
    ({ date, type, duration_min }) as CardioSession

  it('stacks minutes by type per week', () => {
    const { types, rows } = cardioWeekly(
      [
        session('2026-09-29', 'incline_walk', 30),
        session('2026-10-05', 'incline_walk', 30),
        session('2026-10-06', 'bike', 20),
      ],
      ['2026-09-28', '2026-10-05'],
    )
    expect(types).toEqual(['incline_walk', 'bike'])
    expect(rows).toEqual([
      { week: '2026-09-28', incline_walk: 30, bike: 0 },
      { week: '2026-10-05', incline_walk: 30, bike: 20 },
    ])
  })

  it('folds the smallest types into one series beyond four', () => {
    const many = ['walk', 'run', 'bike', 'swim', 'rowing'].map((type, i) =>
      session('2026-10-05', type, 50 - i * 10),
    )
    const { types, rows } = cardioWeekly(many, ['2026-10-05'])
    expect(types).toEqual(['walk', 'run', 'bike', OTHER])
    // order follows the fixed type list, not the minutes
    const reversed = cardioWeekly(
      [...many].reverse().map((s, i) => ({ ...s, duration_min: 50 - i * 10 })),
      ['2026-10-05'],
    )
    expect(reversed.types).toEqual(['bike', 'rowing', 'swim', OTHER])
    expect(rows[0][OTHER]).toBe(20 + 10)
  })
})
