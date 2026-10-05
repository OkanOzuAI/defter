import type { DailyLog, DietPhase, Profile } from '../api/types'
import { adaptiveTdee, estimatedTdee, movingAverage7, weeklyRate } from '../lib/calc'
import type { DateStr } from '../lib/date'

export type WeightSummary = {
  latest: number | undefined
  latestDate: DateStr | undefined
  avg7: number | undefined
  /** Change of the 7-day average over the last week. */
  weekly: { kg: number; pct: number } | undefined
  sincePhaseStart: number | undefined
  toGoal: number | undefined
}

/** Everything the "current weight" block shows, from the loaded daily logs. */
export function weightSummary(
  logs: DailyLog[],
  today: DateStr,
  phase: DietPhase | undefined,
  goalWeight: number | null | undefined,
): WeightSummary {
  const weighIns = logs.filter((log) => log.weight !== null && log.date <= today)
  const last = weighIns.at(-1)
  const avg7 = movingAverage7(logs, today)
  // The trend if there is one, otherwise the latest single reading.
  const current = avg7 ?? last?.weight ?? undefined

  const phaseStart = phase && weighIns.find((log) => log.date >= phase.start_date)
  return {
    latest: last?.weight ?? undefined,
    latestDate: last?.date,
    avg7,
    weekly: weeklyRate(logs, today),
    sincePhaseStart:
      current !== undefined && phaseStart?.weight != null && phaseStart.date !== last?.date
        ? current - phaseStart.weight
        : undefined,
    toGoal: current !== undefined && goalWeight ? goalWeight - current : undefined,
  }
}

export type Maintenance = { kcal: number; source: 'adaptive' | 'formula' } | undefined

/** Adaptive TDEE when there is enough data, otherwise Mifflin-St Jeor × activity. */
export function maintenance(
  logs: DailyLog[],
  today: DateStr,
  profile: Profile | null | undefined,
  weight: number | undefined,
): Maintenance {
  const adaptive = adaptiveTdee(logs, today)
  if (adaptive !== undefined) return { kcal: adaptive, source: 'adaptive' }
  const formula = estimatedTdee({
    weightKg: weight,
    heightCm: profile?.height_cm,
    birthYear: profile?.birth_year,
    sex: profile?.sex,
    activityLevel: profile?.activity_level,
    currentYear: Number(today.slice(0, 4)),
  })
  return formula === undefined ? undefined : { kcal: formula, source: 'formula' }
}
