import { describe, expect, it } from 'vitest'
import type { CardioSession } from '../api/types'
import { kcalFromVo2, walkingVo2 } from '../lib/calc'
import { derivedText, emptyForm, toForm, toSession, type CardioForm } from './form'
import { goalStreak, stepsAverage7, stepsByDay, weekSummary } from './stats'

const context = { id: 'c1', userId: 'u', speedUnit: 'kmh' as const, weightKg: 80 }
const form = (type: CardioForm['type'], values: Partial<CardioForm>): CardioForm => ({
  ...emptyForm(type, '2026-10-06'),
  ...values,
})
const ok = (result: ReturnType<typeof toSession>): CardioSession => {
  if ('error' in result) throw new Error(`unexpected error on ${result.error}`)
  return result
}

describe('cardio form', () => {
  it('estimates kcal for a 12-3-30 style incline walk and flags it', () => {
    const session = ok(
      toSession(form('incline_walk', { duration: '30', speed: '4,8', incline: '12' }), context),
    )
    expect(session).toMatchObject({
      type: 'incline_walk',
      duration_min: 30,
      speed_kmh: 4.8,
      incline_pct: 12,
      kcal_estimated: true,
    })
    expect(session.kcal).toBe(Math.round(kcalFromVo2(walkingVo2(4.8, 12), 80, 30)))
  })

  it("uses the machine's kcal when entered", () => {
    const session = ok(toSession(form('bike', { duration: '45', kcal: '410' }), context))
    expect(session).toMatchObject({ kcal: 410, kcal_estimated: false })
  })

  it('leaves kcal empty when there is no body weight to estimate with', () => {
    const session = ok(
      toSession(form('bike', { duration: '45' }), { ...context, weightKg: undefined }),
    )
    expect(session).toMatchObject({ kcal: null, kcal_estimated: false })
  })

  it('converts mph and metres, and ignores fields the type does not have', () => {
    const walk = ok(
      toSession(form('walk', { duration: '30', speed: '3', watts: '200' }), {
        ...context,
        speedUnit: 'mph',
      }),
    )
    expect(walk.speed_kmh).toBeCloseTo(4.828, 3)
    expect(walk.watts).toBeNull()
    const row = ok(toSession(form('rowing', { duration: '8', distance: '2000' }), context))
    expect(row.distance_km).toBe(2)
  })

  it('stores type-specific extras in details', () => {
    const hiit = ok(
      toSession(
        form('hiit', { duration: '20', rounds: '8', work_sec: '40', rest_sec: '20' }),
        context,
      ),
    )
    expect(hiit.details).toEqual({ rounds: 8, work_sec: 40, rest_sec: 20 })
    const stairs = ok(toSession(form('stairmaster', { duration: '15', floors: '60' }), context))
    expect(stairs.details).toEqual({ floors: 60 })
  })

  it('reports the field that is wrong', () => {
    expect(toSession(form('walk', {}), context)).toEqual({ error: 'duration' })
    expect(toSession(form('walk', { duration: '30', distance: 'x' }), context)).toEqual({
      error: 'distance',
    })
    expect(toSession(form('walk', { duration: '30', intensity: '11' }), context)).toEqual({
      error: 'intensity',
    })
  })

  it('round-trips a session through the form', () => {
    const original = ok(
      toSession(
        form('run', { duration: '25', distance: '5', incline: '1', avg_hr: '158', note: 'tempo' }),
        context,
      ),
    )
    const again = ok(toSession(toForm(original, 'kmh', 'tr'), context))
    expect(again).toEqual(original)
    // an estimate is not turned into an "entered" value
    expect(toForm(original, 'kmh', 'tr').kcal).toBe('')
  })

  it('shows the figure that fits the type', () => {
    const base = ok(toSession(form('run', { duration: '25', distance: '5' }), context))
    expect(derivedText(base, 'kmh', 'tr')).toBe('5:00 /km')
    expect(
      derivedText(
        ok(toSession(form('rowing', { duration: '8', distance: '2000' }), context)),
        'kmh',
        'tr',
      ),
    ).toBe('2:00 /500 m')
    expect(
      derivedText(
        ok(toSession(form('swim', { duration: '20', distance: '1000' }), context)),
        'kmh',
        'tr',
      ),
    ).toBe('2:00 /100 m')
    const walk = ok(toSession(form('walk', { duration: '60', distance: '5,5' }), context))
    expect(derivedText(walk, 'kmh', 'tr')).toBe('5,5 km/h')
    expect(derivedText(walk, 'mph', 'en')).toBe('3.4 mph')
    expect(
      derivedText(ok(toSession(form('elliptical', { duration: '20' }), context)), 'kmh', 'tr'),
    ).toBe('')
  })
})

describe('steps and weekly summary', () => {
  const logs = [
    { date: '2026-09-30', steps: 12000 },
    { date: '2026-10-01', steps: 9000 },
    { date: '2026-10-02', steps: null },
    { date: '2026-10-04', steps: 10000 },
    { date: '2026-10-05', steps: 11000 },
    { date: '2026-10-06', steps: 4000 },
  ]

  it('averages the logged days of the last 7', () => {
    expect(stepsAverage7(logs, '2026-10-06')).toBe((12000 + 9000 + 10000 + 11000 + 4000) / 5)
    expect(stepsAverage7([], '2026-10-06')).toBeUndefined()
  })

  it('counts the goal streak without punishing an unfinished today', () => {
    expect(goalStreak(logs, 10000, '2026-10-06')).toBe(2)
    expect(goalStreak(logs, 10000, '2026-10-05')).toBe(2)
    expect(goalStreak(logs, 3000, '2026-10-06')).toBe(3)
    expect(goalStreak(logs, null, '2026-10-06')).toBe(0)
  })

  it('builds seven bars', () => {
    expect(stepsByDay(logs, '2026-10-06').map((d) => d.steps)).toEqual([
      12000, 9000, 0, 0, 10000, 11000, 4000,
    ])
  })

  it('summarises a week', () => {
    const session = (over: Partial<CardioSession>): CardioSession => ({
      ...ok(toSession(form('walk', { duration: '30' }), context)),
      ...over,
    })
    const summary = weekSummary(
      [
        session({
          date: '2026-10-05',
          type: 'incline_walk',
          duration_min: 30,
          kcal: 345,
          kcal_estimated: true,
        }),
        session({
          date: '2026-10-06',
          type: 'incline_walk',
          duration_min: 30,
          kcal: 345,
          kcal_estimated: true,
        }),
        session({
          date: '2026-10-06',
          type: 'bike',
          duration_min: 20,
          distance_km: 8,
          kcal: 180,
          kcal_estimated: false,
        }),
        session({ date: '2026-10-04', type: 'run', duration_min: 99 }), // previous week
      ],
      logs,
      '2026-10-05',
    )
    expect(summary).toEqual({
      minutes: 80,
      distanceKm: 8,
      kcal: 870,
      kcalEstimated: true,
      minutesByType: [
        { type: 'incline_walk', minutes: 60 },
        { type: 'bike', minutes: 20 },
      ],
      stepsAverage: 7500,
    })
  })
})
