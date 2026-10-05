import type { DietPhase, Macros, Supplement, SupplementLog } from '../api/types'
import { reverseDietTarget } from './calc'
import { addDays, diffDays, type DateStr } from './date'

/** The phase covering `date`; if several overlap, the one that started most recently. */
export function activePhase(phases: DietPhase[], date: DateStr): DietPhase | undefined {
  return phases
    .filter((p) => p.start_date <= date && (p.end_date === null || p.end_date >= date))
    .sort((a, b) => b.start_date.localeCompare(a.start_date))[0]
}

/** "Gün 12": the first day of a phase is day 1. */
export function phaseDay(phase: DietPhase, date: DateStr): number {
  return diffDays(phase.start_date, date) + 1
}

export type DayTargets = {
  kcal: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
}

/**
 * Targets for one day. Rest days fall back to the training-day numbers when no
 * rest-day value is set. In a reverse diet the kcal target climbs by the weekly step.
 */
export function dayTargets(phase: DietPhase, date: DateStr, isTrainingDay: boolean): DayTargets {
  const pick = (training: number | null, rest: number | null) =>
    isTrainingDay ? training : (rest ?? training)

  let kcal = pick(phase.kcal_training, phase.kcal_rest)
  if (kcal !== null && phase.type === 'reverse' && phase.weekly_kcal_step) {
    kcal = reverseDietTarget(kcal, phase.weekly_kcal_step, diffDays(phase.start_date, date))
  }
  return {
    kcal,
    protein: pick(phase.protein, phase.protein_rest),
    carbs: pick(phase.carbs, phase.carbs_rest),
    fat: pick(phase.fat, phase.fat_rest),
  }
}

// --- Supplements ------------------------------------------------------------

/** How many default servings a log represents (a log of 10 g for a 5 g supplement = 2). */
function servings(log: SupplementLog, supplement: Supplement): number {
  if (!supplement.dose || log.dose === null) return 1
  return log.dose / supplement.dose
}

export function caffeineTotal(logs: SupplementLog[], supplements: Supplement[]): number {
  const byId = new Map(supplements.map((s) => [s.id, s]))
  return logs.reduce((sum, log) => {
    const supplement = byId.get(log.supplement_id)
    if (!supplement?.caffeine_mg) return sum
    return sum + supplement.caffeine_mg * servings(log, supplement)
  }, 0)
}

/** Macros from the supplements that are set to count toward the day. */
export function supplementMacros(
  logs: SupplementLog[],
  supplements: Supplement[],
): Required<Macros> {
  const byId = new Map(supplements.map((s) => [s.id, s]))
  const total = { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  for (const log of logs) {
    const supplement = byId.get(log.supplement_id)
    if (!supplement?.count_macros || !supplement.macros) continue
    const n = servings(log, supplement)
    total.kcal += (supplement.macros.kcal ?? 0) * n
    total.protein += (supplement.macros.protein ?? 0) * n
    total.carbs += (supplement.macros.carbs ?? 0) * n
    total.fat += (supplement.macros.fat ?? 0) * n
  }
  return total
}

/** Total dose logged per supplement on one day, to compare with its daily max. */
export function doseTotals(logs: SupplementLog[]): Map<string, number> {
  const totals = new Map<string, number>()
  for (const log of logs) {
    totals.set(log.supplement_id, (totals.get(log.supplement_id) ?? 0) + (log.dose ?? 0))
  }
  return totals
}

export type Adherence = { pct7: number; pct30: number; streak: number }

/**
 * Share of the last 7 and 30 days (ending today) on which something was logged, and
 * the current run of consecutive days. Today not being logged yet does not break a streak.
 */
export function adherence(loggedDates: Iterable<DateStr>, today: DateStr): Adherence {
  const days = new Set(loggedDates)
  const share = (window: number) => {
    let hit = 0
    for (let i = 0; i < window; i++) if (days.has(addDays(today, -i))) hit += 1
    return (hit / window) * 100
  }
  let streak = 0
  let cursor = days.has(today) ? today : addDays(today, -1)
  while (days.has(cursor)) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return { pct7: share(7), pct30: share(30), streak }
}
