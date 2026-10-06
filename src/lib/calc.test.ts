import { describe, expect, it } from 'vitest'
import { EXERCISES, findAlternatives, getLibraryExercise } from '../data/exercises'
import {
  adaptiveTdee,
  e1rm,
  effectiveRir,
  estimateCardioKcal,
  estimatedTdee,
  formatClock,
  hardSetsPerMuscle,
  isHardSet,
  kcalFromMacros,
  kcalFromVo2,
  kcalMismatch,
  kmhToMph,
  mifflinStJeorBmr,
  movingAverage7,
  mphToKmh,
  paceSecPerKm,
  parseNumber,
  recentBodyweight,
  reverseDietTarget,
  rirToRpe,
  rowingSplitSec,
  rpeToRir,
  runningVo2,
  saltGToSodiumMg,
  sodiumMgToSaltG,
  speedKmh,
  swimPaceSec,
  volumeLoad,
  walkingVo2,
  weeklyRate,
  type EnergyDay,
  type WeightPoint,
} from './calc'
import { addDays } from './date'

describe('conversions', () => {
  it('parses numbers with either separator', () => {
    expect(parseNumber('82,5')).toBe(82.5)
    expect(parseNumber('')).toBeUndefined()
    expect(parseNumber('x')).toBeUndefined()
  })

  it('converts salt and sodium', () => {
    expect(sodiumMgToSaltG(2000)).toBe(5)
    expect(saltGToSodiumMg(5)).toBe(2000)
  })

  it('computes kcal from macros and flags a >10% mismatch', () => {
    expect(kcalFromMacros(180, 300, 70)).toBe(2550)
    expect(kcalMismatch(2550, 2550)).toBe(false)
    expect(kcalMismatch(2500, 2700)).toBe(false) // 8%
    expect(kcalMismatch(2500, 2800)).toBe(true) // 12%
    expect(kcalMismatch(0, 2800)).toBe(false)
  })

  it('converts RIR and RPE', () => {
    expect(rirToRpe(2)).toBe(8)
    expect(rpeToRir(9.5)).toBe(0.5)
  })

  it('converts mph and km/h', () => {
    expect(mphToKmh(3)).toBeCloseTo(4.828, 3)
    expect(kmhToMph(4.828032)).toBeCloseTo(3, 6)
  })
})

describe('e1RM', () => {
  it('uses weight × (1 + (reps + RIR) / 30)', () => {
    expect(e1rm({ weight: 80, reps: 8, rir: 2 })).toBeCloseTo(80 * (1 + 10 / 30), 6)
    expect(e1rm({ weight: 100, reps: 5, rir: 0 })).toBeCloseTo(116.667, 3)
  })

  it('treats failure as RIR 0 and near failure with empty RIR as 1', () => {
    expect(effectiveRir({ failure: 'failure', rir: 3 })).toBe(0)
    expect(effectiveRir({ failure: 'near' })).toBe(1)
    expect(effectiveRir({ failure: 'near', rir: 2 })).toBe(2)
    expect(e1rm({ weight: 77.5, reps: 8, failure: 'failure' })).toBeCloseTo(77.5 * (1 + 8 / 30), 6)
    expect(e1rm({ weight: 60, reps: 10, failure: 'near' })).toBeCloseTo(60 * (1 + 11 / 30), 6)
  })

  it('is undefined without RIR and without a failure chip', () => {
    expect(effectiveRir({ failure: 'none' })).toBeUndefined()
    expect(e1rm({ weight: 80, reps: 8 })).toBeUndefined()
    expect(e1rm({ weight: 80, reps: 8, failure: 'none', rir: null })).toBeUndefined()
  })

  it('skips sets with reps + RIR above 15, or without reps or load', () => {
    expect(e1rm({ weight: 40, reps: 14, rir: 2 })).toBeUndefined()
    expect(e1rm({ weight: 40, reps: 13, rir: 2 })).toBeDefined()
    expect(e1rm({ weight: 40, reps: 0, rir: 0 })).toBeUndefined()
    expect(e1rm({ weight: null, reps: 8, rir: 1 })).toBeUndefined()
  })

  it('adds body weight for bodyweight-loaded lifts, and skips them without a recent weigh-in', () => {
    const set = { weight: 20, reps: 6, rir: 1 }
    expect(e1rm(set, { loadMode: 'added_bodyweight', bodyweight: 80 })).toBeCloseTo(
      100 * (1 + 7 / 30),
      6,
    )
    expect(
      e1rm({ weight: null, reps: 10, rir: 0 }, { loadMode: 'added_bodyweight', bodyweight: 80 }),
    ).toBeCloseTo(80 * (1 + 10 / 30), 6)
    expect(e1rm(set, { loadMode: 'added_bodyweight' })).toBeUndefined()
  })

  it('finds a weigh-in from the last 7 days only', () => {
    const logs = [
      { date: '2026-09-20', weight: 84 },
      { date: '2026-10-01', weight: 82.5 },
      { date: '2026-10-03', weight: null },
    ]
    expect(recentBodyweight(logs, '2026-10-06')).toBe(82.5)
    expect(recentBodyweight(logs, '2026-10-08')).toBe(82.5)
    expect(recentBodyweight(logs, '2026-10-09')).toBeUndefined()
    expect(recentBodyweight(logs, '2026-09-30')).toBeUndefined() // never from the future
  })
})

describe('volume and hard sets', () => {
  it('sums weight × reps without warm-ups', () => {
    expect(
      volumeLoad([
        { set_type: 'warmup', weight: 40, reps: 10 },
        { set_type: 'working', weight: 80, reps: 8 },
        { set_type: 'top', weight: 90, reps: 5 },
        { set_type: 'drop', weight: 60, reps: null },
      ]),
    ).toBe(80 * 8 + 90 * 5)
  })

  it('counts a set as hard at RIR ≤ 4 or with a failure chip, never a warm-up', () => {
    expect(isHardSet({ rir: 4 })).toBe(true)
    expect(isHardSet({ rir: 5 })).toBe(false)
    expect(isHardSet({ rir: null })).toBe(false)
    expect(isHardSet({ failure: 'near' })).toBe(true)
    expect(isHardSet({ failure: 'failure', rir: null })).toBe(true)
    expect(isHardSet({ set_type: 'warmup', rir: 0, failure: 'failure' })).toBe(false)
  })

  it('credits primary muscles 1 and secondary 0.5, and half for one-sided sets', () => {
    const totals = hardSetsPerMuscle(
      [
        { exercise_id: 'barbell-flat-bench-press', rir: 2 },
        { exercise_id: 'barbell-flat-bench-press', failure: 'failure' },
        { exercise_id: 'barbell-flat-bench-press', rir: 2, set_type: 'warmup' },
        { exercise_id: 'barbell-flat-bench-press', rir: 6 },
        { exercise_id: 'single-arm-pec-deck', rir: 1, side: 'L' },
        { exercise_id: 'single-arm-pec-deck', rir: 1, side: 'R' },
        { exercise_id: 'single-arm-pec-deck', rir: 0, side: 'L' },
        { exercise_id: 'unknown', rir: 0 },
      ],
      getLibraryExercise,
    )
    expect(totals.chest).toBe(2 + 1.5)
    expect(totals.triceps).toBe(1)
    expect(totals.front_delts).toBe(1 + 0.75)
    expect(totals.lats).toBeUndefined()
  })
})

describe('weight trend', () => {
  const series = (start: string, weights: (number | null)[]): WeightPoint[] =>
    weights.map((weight, i) => ({ date: addDays(start, i), weight }))

  it('averages the last 7 days, skipping missing days', () => {
    const points = series('2026-10-01', [82, null, 83, 82.5, null, 82.5, 82])
    expect(movingAverage7(points, '2026-10-07')).toBeCloseTo(82.4, 6)
  })

  it('needs at least 4 weigh-ins in the window', () => {
    const points = series('2026-10-01', [82, null, 83, null, null, 82.5, null])
    expect(movingAverage7(points, '2026-10-07')).toBeUndefined()
    expect(movingAverage7([], '2026-10-07')).toBeUndefined()
  })

  it('ignores weigh-ins outside the window', () => {
    const points = series('2026-09-24', [90, 90, 90, 90, 90, 90, 90, 80, 80, 80, 80, 80, 80, 80])
    expect(movingAverage7(points, '2026-10-07')).toBe(80)
  })

  it('reports the weekly rate in kg and % of body weight', () => {
    const points = series('2026-09-24', [80, 80, 80, 80, 80, 80, 80, 79, 79, 79, 79, 79, 79, 79])
    const rate = weeklyRate(points, '2026-10-07')
    expect(rate?.kg).toBeCloseTo(-1, 6)
    expect(rate?.pct).toBeCloseTo(-1.25, 6)
    expect(weeklyRate(points, '2026-10-01')).toBeUndefined()
  })
})

describe('energy', () => {
  const days = (
    weightAt: (i: number) => number | null,
    kcalAt: (i: number) => number | null,
  ): EnergyDay[] =>
    Array.from({ length: 21 }, (_, i) => ({
      date: addDays('2026-09-16', i),
      weight: weightAt(i),
      calories: kcalAt(i),
    }))

  it('equals intake when weight is flat', () => {
    expect(
      adaptiveTdee(
        days(
          () => 80,
          () => 2600,
        ),
        '2026-10-06',
      ),
    ).toBeCloseTo(2600, 6)
  })

  it('adds the deficit implied by weight loss', () => {
    // losing 0.05 kg/day at 2200 kcal → 2200 + 0.05 × 7700 = 2585
    const tdee = adaptiveTdee(
      days(
        (i) => 82 - 0.05 * i,
        () => 2200,
      ),
      '2026-10-06',
    )
    expect(tdee).toBeCloseTo(2585, 6)
  })

  it('subtracts the surplus implied by weight gain', () => {
    const tdee = adaptiveTdee(
      days(
        (i) => 80 + 0.02 * i,
        () => 3000,
      ),
      '2026-10-06',
    )
    expect(tdee).toBeCloseTo(3000 - 154, 6)
  })

  it('needs 14 days with both weight and calories', () => {
    const sparse = days(
      (i) => (i % 2 === 0 ? 80 : null),
      () => 2500,
    )
    expect(adaptiveTdee(sparse, '2026-10-06')).toBeUndefined() // 11 complete days
    const enough = days(
      (i) => (i < 14 ? 80 : null),
      () => 2500,
    )
    expect(adaptiveTdee(enough, '2026-10-06')).toBeCloseTo(2500, 6)
    // the same data is too old three weeks later
    expect(adaptiveTdee(enough, '2026-10-27')).toBeUndefined()
  })

  it('computes Mifflin-St Jeor', () => {
    expect(mifflinStJeorBmr(80, 180, 30, 'male')).toBe(1780)
    expect(mifflinStJeorBmr(60, 165, 30, 'female')).toBe(1320.25)
  })

  it('applies the activity factor and hides the estimate when data is missing', () => {
    const base = {
      weightKg: 80,
      heightCm: 180,
      birthYear: 1996,
      sex: 'male' as const,
      activityLevel: 'moderate' as const,
      currentYear: 2026,
    }
    expect(estimatedTdee(base)).toBeCloseTo(1780 * 1.55, 6)
    expect(estimatedTdee({ ...base, activityLevel: null })).toBeCloseTo(1780 * 1.2, 6)
    expect(estimatedTdee({ ...base, sex: null })).toBeUndefined()
    expect(estimatedTdee({ ...base, heightCm: null })).toBeUndefined()
    expect(estimatedTdee({ ...base, birthYear: null })).toBeUndefined()
  })

  it('steps the reverse diet target once per full week', () => {
    expect(reverseDietTarget(2200, 100, 0)).toBe(2200)
    expect(reverseDietTarget(2200, 100, 6)).toBe(2200)
    expect(reverseDietTarget(2200, 100, 7)).toBe(2300)
    expect(reverseDietTarget(2200, 100, 20)).toBe(2400)
    expect(reverseDietTarget(2200, 100, -3)).toBe(2200)
  })
})

describe('cardio', () => {
  it('uses the ACSM walking equation', () => {
    // 4.8 km/h = 80 m/min at 12%: 3.5 + 8 + 1.8 × 80 × 0.12 = 28.78
    expect(walkingVo2(4.8, 12)).toBeCloseTo(28.78, 6)
    expect(walkingVo2(4.8)).toBeCloseTo(11.5, 6)
  })

  it('uses the ACSM running equation', () => {
    // 10 km/h = 166.67 m/min: 3.5 + 33.33 + 0.9 × 166.67 × 0.01 = 38.33
    expect(runningVo2(10, 1)).toBeCloseTo(38.333, 3)
  })

  it('converts VO2 to kcal', () => {
    expect(kcalFromVo2(28.78, 80, 30)).toBeCloseTo(345.36, 2)
  })

  it('estimates walking and running from speed or from distance', () => {
    const incline = {
      type: 'incline_walk' as const,
      durationMin: 30,
      speedKmh: 4.8,
      inclinePct: 12,
    }
    expect(estimateCardioKcal(incline, 80)).toBeCloseTo(345.36, 2)
    const run = { type: 'run' as const, durationMin: 30, distanceKm: 5 }
    expect(estimateCardioKcal(run, 80)).toBeCloseTo(kcalFromVo2(runningVo2(10), 80, 30), 6)
  })

  it('falls back to MET × kg × hours', () => {
    expect(estimateCardioKcal({ type: 'bike', durationMin: 60 }, 80)).toBeCloseTo(6.8 * 80, 6)
    expect(estimateCardioKcal({ type: 'bike', durationMin: 30, intensity: 9 }, 80)).toBeCloseTo(
      8.8 * 40,
      6,
    )
    expect(estimateCardioKcal({ type: 'rowing', durationMin: 20, intensity: 2 }, 75)).toBeCloseTo(
      4.8 * 25,
      6,
    )
    expect(estimateCardioKcal({ type: 'walk', durationMin: 60 }, 80)).toBeCloseTo(3.5 * 80, 6)
  })

  it('needs a duration and a body weight', () => {
    expect(estimateCardioKcal({ type: 'bike' }, 80)).toBeUndefined()
    expect(estimateCardioKcal({ type: 'bike', durationMin: 30 }, null)).toBeUndefined()
  })

  it('computes speed, pace, rowing split and swim pace', () => {
    expect(speedKmh(5, 30)).toBe(10)
    expect(paceSecPerKm(5, 25)).toBe(300)
    expect(formatClock(paceSecPerKm(10, 47.5)!)).toBe('4:45')
    expect(rowingSplitSec(2, 8)).toBe(120)
    expect(swimPaceSec(1, 20)).toBe(120)
    expect(speedKmh(0, 30)).toBeUndefined()
    expect(paceSecPerKm(5, null)).toBeUndefined()
    expect(formatClock(59.6)).toBe('1:00')
  })
})

describe('exercise library', () => {
  it('has every seeded exercise exactly once', () => {
    expect(EXERCISES).toHaveLength(206)
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length)
    expect(new Set(EXERCISES.map((e) => e.name)).size).toBe(EXERCISES.length)
  })

  it('gives every exercise a primary muscle and sane defaults', () => {
    for (const exercise of EXERCISES) {
      expect(exercise.primaryMuscles.length, exercise.name).toBeGreaterThan(0)
      expect(exercise.increment, exercise.name).toBeGreaterThan(0)
      expect(exercise.restSec, exercise.name).toBe(exercise.isCompound ? 180 : 90)
    }
  })

  it('logs Smith lifts without the bar and dumbbells per hand', () => {
    expect(getLibraryExercise('smith-flat-bench-press')?.barWeight).toBe(0)
    expect(getLibraryExercise('barbell-flat-bench-press')?.barWeight).toBe(20)
    expect(getLibraryExercise('db-flat-press')?.loadMode).toBe('per_hand')
    expect(getLibraryExercise('weighted-pull-up')?.loadMode).toBe('added_bodyweight')
    expect(getLibraryExercise('single-arm-pec-deck')?.unilateral).toBe(true)
  })

  it('offers alternatives with the same pattern and primary muscle', () => {
    const bench = getLibraryExercise('barbell-flat-bench-press')!
    const ids = findAlternatives(bench).map((e) => e.id)
    expect(ids).toContain('smith-flat-bench-press')
    expect(ids).toContain('db-flat-press')
    expect(ids).not.toContain('barbell-flat-bench-press')
    expect(ids).not.toContain('barbell-incline-bench-press')
    expect(ids).not.toContain('pec-deck')
  })
})
