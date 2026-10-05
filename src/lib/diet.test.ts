import { describe, expect, it } from 'vitest'
import type { DietPhase, Supplement, SupplementLog } from '../api/types'
import { addDays } from './date'
import {
  activePhase,
  adherence,
  caffeineTotal,
  dayTargets,
  doseTotals,
  phaseDay,
  supplementMacros,
} from './diet'

const phase = (over: Partial<DietPhase>): DietPhase => ({
  id: 'p',
  user_id: 'u',
  type: 'cut',
  start_date: '2026-09-01',
  end_date: null,
  kcal_training: 2400,
  kcal_rest: 2200,
  protein: 190,
  carbs: 250,
  fat: 65,
  protein_rest: null,
  carbs_rest: 200,
  fat_rest: null,
  weekly_kcal_step: null,
  target_weekly_change_pct: -0.5,
  ...over,
})

describe('diet phases', () => {
  it('picks the phase covering a date, newest start first', () => {
    const cut = phase({ id: 'cut', start_date: '2026-06-01', end_date: '2026-08-31' })
    const reverse = phase({ id: 'rev', type: 'reverse', start_date: '2026-09-01' })
    expect(activePhase([cut, reverse], '2026-07-15')?.id).toBe('cut')
    expect(activePhase([cut, reverse], '2026-08-31')?.id).toBe('cut')
    expect(activePhase([cut, reverse], '2026-10-06')?.id).toBe('rev')
    expect(activePhase([cut, reverse], '2026-05-31')).toBeUndefined()
    const overlap = phase({ id: 'new', start_date: '2026-07-01', end_date: null })
    expect(activePhase([cut, overlap], '2026-07-15')?.id).toBe('new')
  })

  it('counts phase days from 1', () => {
    expect(phaseDay(phase({ start_date: '2026-09-25' }), '2026-09-25')).toBe(1)
    expect(phaseDay(phase({ start_date: '2026-09-25' }), '2026-10-06')).toBe(12)
  })

  it('uses training or rest targets, falling back to training values', () => {
    const p = phase({})
    expect(dayTargets(p, '2026-09-10', true)).toEqual({
      kcal: 2400,
      protein: 190,
      carbs: 250,
      fat: 65,
    })
    expect(dayTargets(p, '2026-09-10', false)).toEqual({
      kcal: 2200,
      protein: 190,
      carbs: 200,
      fat: 65,
    })
    expect(dayTargets(phase({ kcal_rest: null }), '2026-09-10', false).kcal).toBe(2400)
  })

  it('raises the reverse diet target by the weekly step', () => {
    const reverse = phase({ type: 'reverse', weekly_kcal_step: 100 })
    expect(dayTargets(reverse, '2026-09-01', true).kcal).toBe(2400)
    expect(dayTargets(reverse, '2026-09-07', true).kcal).toBe(2400)
    expect(dayTargets(reverse, '2026-09-08', true).kcal).toBe(2500)
    expect(dayTargets(reverse, '2026-09-22', false).kcal).toBe(2500)
    // the step only applies to reverse phases
    expect(dayTargets(phase({ weekly_kcal_step: 100 }), '2026-09-22', true).kcal).toBe(2400)
  })
})

const supplement = (over: Partial<Supplement>): Supplement => ({
  id: 's',
  user_id: 'u',
  name: 'x',
  dose: 1,
  unit: 'scoop',
  timing: 'any',
  active: true,
  position: 0,
  daily_max: null,
  caffeine_mg: null,
  macros: null,
  count_macros: false,
  ...over,
})
const log = (supplement_id: string, dose: number | null): SupplementLog => ({
  id: crypto.randomUUID(),
  user_id: 'u',
  date: '2026-10-06',
  supplement_id,
  dose,
  time: null,
})

describe('supplements', () => {
  const pre = supplement({ id: 'pre', caffeine_mg: 200 })
  const whey = supplement({
    id: 'whey',
    dose: 30,
    unit: 'g',
    macros: { kcal: 120, protein: 24, carbs: 3, fat: 1.5 },
    count_macros: true,
  })
  const casein = supplement({ id: 'casein', dose: 30, macros: { protein: 24 } })

  it('sums caffeine by servings taken', () => {
    expect(caffeineTotal([log('pre', 1), log('pre', 0.5), log('whey', 30)], [pre, whey])).toBe(300)
    expect(caffeineTotal([log('pre', null)], [pre])).toBe(200)
  })

  it('counts macros only for supplements set to count', () => {
    expect(supplementMacros([log('whey', 45), log('casein', 30)], [whey, casein])).toEqual({
      kcal: 180,
      protein: 36,
      carbs: 4.5,
      fat: 2.25,
    })
  })

  it('totals the dose per supplement', () => {
    const totals = doseTotals([log('pre', 1), log('pre', 1), log('whey', 30)])
    expect(totals.get('pre')).toBe(2)
    expect(totals.get('whey')).toBe(30)
  })

  it('computes adherence and streak', () => {
    const today = '2026-10-06'
    const lastFive = [0, 1, 2, 3, 4].map((i) => addDays(today, -i))
    expect(adherence(lastFive, today)).toEqual({
      pct7: (5 / 7) * 100,
      pct30: (5 / 30) * 100,
      streak: 5,
    })
    // not logged yet today: the streak up to yesterday still stands
    expect(adherence(lastFive.slice(1), today).streak).toBe(4)
    expect(adherence([addDays(today, -2)], today).streak).toBe(0)
    expect(adherence([], today)).toEqual({ pct7: 0, pct30: 0, streak: 0 })
  })
})
