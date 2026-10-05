/**
 * Every formula the app shows lives here, as pure functions covered by calc.test.ts.
 * Nothing in this file suggests what to do in training; it only describes what was logged.
 */
import type { ActivityLevel, Sex } from '../api/types'
import type { LoadMode, Muscle } from '../data/exercises'
import { addDays, diffDays, type DateStr } from './date'

export { parseNumber } from './number'

// ---------------------------------------------------------------------------
// Conversions
// ---------------------------------------------------------------------------

export const rirToRpe = (rir: number) => 10 - rir
export const rpeToRir = (rpe: number) => 10 - rpe

/** Salt (NaCl) is about 40% sodium by weight. */
export const sodiumMgToSaltG = (sodiumMg: number) => (sodiumMg * 2.5) / 1000
export const saltGToSodiumMg = (saltG: number) => (saltG * 1000) / 2.5

export const kcalFromMacros = (protein: number, carbs: number, fat: number) =>
  4 * protein + 4 * carbs + 9 * fat

/** True when entered kcal and macro-derived kcal differ by more than 10%. */
export function kcalMismatch(enteredKcal: number, macroKcal: number): boolean {
  if (enteredKcal <= 0 || macroKcal <= 0) return false
  return Math.abs(enteredKcal - macroKcal) / enteredKcal > 0.1
}

const KM_PER_MILE = 1.609344
export const kmhToMph = (kmh: number) => kmh / KM_PER_MILE
export const mphToKmh = (mph: number) => mph * KM_PER_MILE

// ---------------------------------------------------------------------------
// Strength
// ---------------------------------------------------------------------------

export type Failure = 'none' | 'near' | 'failure'
export type SetType = 'warmup' | 'working' | 'top' | 'backoff' | 'drop'

export type SetInput = {
  weight?: number | null
  reps?: number | null
  rir?: number | null
  failure?: Failure | null
  set_type?: SetType | null
  side?: 'L' | 'R' | null
}

/** Failure → 0. Otherwise the logged RIR. Near failure with no RIR → 1. Nothing logged → undefined. */
export function effectiveRir(set: SetInput): number | undefined {
  if (set.failure === 'failure') return 0
  if (set.rir !== null && set.rir !== undefined) return set.rir
  if (set.failure === 'near') return 1
  return undefined
}

const MAX_E1RM_REPS = 15

/**
 * Estimated 1RM (Epley with reps in reserve): weight × (1 + (reps + RIR) / 30).
 * Undefined when there is no RIR and no failure chip, when reps + RIR > 15, or, for
 * bodyweight-loaded lifts, when no recent body weight is known.
 */
export function e1rm(
  set: SetInput,
  options: { loadMode?: LoadMode; bodyweight?: number | null } = {},
): number | undefined {
  const reps = set.reps
  if (reps === null || reps === undefined || reps <= 0) return undefined

  const rir = effectiveRir(set)
  if (rir === undefined || reps + rir > MAX_E1RM_REPS) return undefined

  let load = set.weight ?? undefined
  if (options.loadMode === 'added_bodyweight') {
    if (options.bodyweight === null || options.bodyweight === undefined) return undefined
    load = options.bodyweight + (set.weight ?? 0)
  }
  if (load === undefined || load <= 0) return undefined

  return load * (1 + (reps + rir) / 30)
}

/** Latest weigh-in from the 7 days up to and including `date`. */
export function recentBodyweight(
  weighIns: { date: DateStr; weight: number | null }[],
  date: DateStr,
): number | undefined {
  let latest: { date: DateStr; weight: number } | undefined
  for (const entry of weighIns) {
    if (entry.weight === null) continue
    const age = diffDays(entry.date, date)
    if (age < 0 || age > 7) continue
    if (!latest || entry.date > latest.date) latest = { date: entry.date, weight: entry.weight }
  }
  return latest?.weight
}

/** Σ weight × reps over non-warm-up sets. */
export function volumeLoad(sets: SetInput[]): number {
  return sets.reduce((sum, set) => {
    if (set.set_type === 'warmup') return sum
    return sum + (set.weight ?? 0) * (set.reps ?? 0)
  }, 0)
}

/** A non-warm-up set taken to RIR ≤ 4 or carrying a failure chip. */
export function isHardSet(set: SetInput): boolean {
  if (set.set_type === 'warmup') return false
  if (set.failure === 'near' || set.failure === 'failure') return true
  return set.rir !== null && set.rir !== undefined && set.rir <= 4
}

type MuscleMap = { primaryMuscles: Muscle[]; secondaryMuscles: Muscle[] }

/**
 * Hard sets per muscle: primary = 1, secondary = 0.5.
 * A set logged for one side only (L or R) is half a set, so an L+R pair counts once.
 */
export function hardSetsPerMuscle(
  sets: (SetInput & { exercise_id: string })[],
  getExercise: (id: string) => MuscleMap | undefined,
): Partial<Record<Muscle, number>> {
  const totals: Partial<Record<Muscle, number>> = {}
  for (const set of sets) {
    if (!isHardSet(set)) continue
    const exercise = getExercise(set.exercise_id)
    if (!exercise) continue
    const unit = set.side ? 0.5 : 1
    for (const muscle of exercise.primaryMuscles) {
      totals[muscle] = (totals[muscle] ?? 0) + unit
    }
    for (const muscle of exercise.secondaryMuscles) {
      totals[muscle] = (totals[muscle] ?? 0) + unit * 0.5
    }
  }
  return totals
}

// ---------------------------------------------------------------------------
// Weight & energy
// ---------------------------------------------------------------------------

export type WeightPoint = { date: DateStr; weight: number | null }

const MIN_POINTS_IN_WEEK = 4

/** Mean of the weigh-ins in the 7 days ending on `date`; needs at least 4 of them. */
export function movingAverage7(points: WeightPoint[], date: DateStr): number | undefined {
  const from = addDays(date, -6)
  const window = points.filter(
    (p): p is { date: DateStr; weight: number } =>
      p.weight !== null && p.date >= from && p.date <= date,
  )
  if (window.length < MIN_POINTS_IN_WEEK) return undefined
  return window.reduce((sum, p) => sum + p.weight, 0) / window.length
}

/** Change of the 7-day average over the last week, in kg and as % of body weight. */
export function weeklyRate(
  points: WeightPoint[],
  date: DateStr,
): { kg: number; pct: number } | undefined {
  const now = movingAverage7(points, date)
  const weekAgo = movingAverage7(points, addDays(date, -7))
  if (now === undefined || weekAgo === undefined) return undefined
  const kg = now - weekAgo
  return { kg, pct: (kg / weekAgo) * 100 }
}

const KCAL_PER_KG = 7700
const TDEE_WINDOW_DAYS = 21
const TDEE_MIN_COMPLETE_DAYS = 14

export type EnergyDay = { date: DateStr; weight: number | null; calories: number | null }

/**
 * Adaptive TDEE over the 21 days ending on `date`:
 * mean intake − (trend weight change × 7700) / days.
 * The trend is the least-squares slope of the weigh-ins (kg/day), which is the same
 * thing per day and is not thrown off by a single high or low morning.
 * Needs ≥ 14 days in the window that have both weight and calories.
 */
export function adaptiveTdee(days: EnergyDay[], date: DateStr): number | undefined {
  const from = addDays(date, -(TDEE_WINDOW_DAYS - 1))
  const complete = days.filter(
    (d): d is { date: DateStr; weight: number; calories: number } =>
      d.date >= from && d.date <= date && d.weight !== null && d.calories !== null,
  )
  if (complete.length < TDEE_MIN_COMPLETE_DAYS) return undefined

  const meanKcal = complete.reduce((sum, d) => sum + d.calories, 0) / complete.length

  const xs = complete.map((d) => diffDays(from, d.date))
  const meanX = xs.reduce((a, b) => a + b, 0) / xs.length
  const meanW = complete.reduce((sum, d) => sum + d.weight, 0) / complete.length
  let covariance = 0
  let variance = 0
  complete.forEach((d, i) => {
    covariance += (xs[i] - meanX) * (d.weight - meanW)
    variance += (xs[i] - meanX) ** 2
  })
  if (variance === 0) return undefined
  const kgPerDay = covariance / variance

  return meanKcal - kgPerDay * KCAL_PER_KG
}

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  extra: 1.9,
}

/** Mifflin-St Jeor basal metabolic rate in kcal/day. */
export function mifflinStJeorBmr(weightKg: number, heightCm: number, age: number, sex: Sex) {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161)
}

/** BMR × activity factor. Undefined when sex, height or birth year is missing. */
export function estimatedTdee(input: {
  weightKg: number | null | undefined
  heightCm: number | null | undefined
  birthYear: number | null | undefined
  sex: Sex | null | undefined
  activityLevel: ActivityLevel | null | undefined
  currentYear: number
}): number | undefined {
  const { weightKg, heightCm, birthYear, sex, activityLevel, currentYear } = input
  if (!weightKg || !heightCm || !birthYear || !sex) return undefined
  const bmr = mifflinStJeorBmr(weightKg, heightCm, currentYear - birthYear, sex)
  return bmr * ACTIVITY_FACTORS[activityLevel ?? 'sedentary']
}

/** Reverse diet: start kcal + weekly step × full weeks since the phase started. */
export function reverseDietTarget(startKcal: number, weeklyStep: number, daysSinceStart: number) {
  return startKcal + weeklyStep * Math.floor(Math.max(0, daysSinceStart) / 7)
}

// ---------------------------------------------------------------------------
// Cardio
// ---------------------------------------------------------------------------

export type CardioType =
  | 'walk'
  | 'incline_walk'
  | 'run'
  | 'bike'
  | 'elliptical'
  | 'stairmaster'
  | 'rowing'
  | 'swim'
  | 'jump_rope'
  | 'hiit'
  | 'other'

export const CARDIO_TYPES: CardioType[] = [
  'walk',
  'incline_walk',
  'run',
  'bike',
  'elliptical',
  'stairmaster',
  'rowing',
  'swim',
  'jump_rope',
  'hiit',
  'other',
]

const kmhToMetersPerMin = (kmh: number) => (kmh * 1000) / 60

/** ACSM walking equation. VO2 in ml/kg/min; incline as a percentage. */
export function walkingVo2(speedKmh: number, inclinePct = 0): number {
  const s = kmhToMetersPerMin(speedKmh)
  return 3.5 + 0.1 * s + 1.8 * s * (inclinePct / 100)
}

/** ACSM running equation. VO2 in ml/kg/min; incline as a percentage. */
export function runningVo2(speedKmh: number, inclinePct = 0): number {
  const s = kmhToMetersPerMin(speedKmh)
  return 3.5 + 0.2 * s + 0.9 * s * (inclinePct / 100)
}

/** ml/kg/min → kcal, at 5 kcal per litre of oxygen. */
export function kcalFromVo2(vo2: number, weightKg: number, minutes: number): number {
  return ((vo2 * weightKg) / 1000) * 5 * minutes
}

type Effort = 'low' | 'moderate' | 'high'

/**
 * MET values from the 2011 Compendium of Physical Activities, by type and effort.
 * Where the Compendium lists one value for a type (elliptical, stair machine, circuit/HIIT)
 * that value is "moderate" and low/high are it × 0.8 / × 1.2. "other" is a generic range.
 */
export const CARDIO_METS: Record<CardioType, Record<Effort, number>> = {
  walk: { low: 3.0, moderate: 3.5, high: 4.3 },
  incline_walk: { low: 5.3, moderate: 6.0, high: 8.0 },
  run: { low: 7.0, moderate: 9.8, high: 11.8 },
  bike: { low: 3.5, moderate: 6.8, high: 8.8 },
  elliptical: { low: 4.0, moderate: 5.0, high: 6.0 },
  stairmaster: { low: 7.2, moderate: 9.0, high: 10.8 },
  rowing: { low: 4.8, moderate: 7.0, high: 8.5 },
  swim: { low: 5.8, moderate: 8.3, high: 9.8 },
  jump_rope: { low: 8.8, moderate: 11.8, high: 12.3 },
  hiit: { low: 6.4, moderate: 8.0, high: 9.6 },
  other: { low: 4.0, moderate: 6.0, high: 8.0 },
}

/** Perceived intensity 1–10 → effort bucket; no intensity logged counts as moderate. */
export function effortOf(intensity: number | null | undefined): Effort {
  if (intensity === null || intensity === undefined) return 'moderate'
  if (intensity <= 3) return 'low'
  if (intensity <= 6) return 'moderate'
  return 'high'
}

export type CardioInput = {
  type: CardioType
  durationMin?: number | null
  distanceKm?: number | null
  speedKmh?: number | null
  inclinePct?: number | null
  intensity?: number | null
}

/**
 * Estimated kcal for a cardio session. Walking and running use the ACSM equations
 * when a speed is known (entered, or distance ÷ time); everything else is MET × kg × hours.
 * Undefined without a duration or a body weight.
 */
export function estimateCardioKcal(
  input: CardioInput,
  weightKg: number | null | undefined,
): number | undefined {
  const minutes = input.durationMin
  if (!minutes || minutes <= 0 || !weightKg || weightKg <= 0) return undefined

  const speed = input.speedKmh || speedKmh(input.distanceKm, minutes)
  const usesAcsm = input.type === 'walk' || input.type === 'incline_walk' || input.type === 'run'
  if (usesAcsm && speed) {
    const incline = input.inclinePct ?? 0
    const vo2 = input.type === 'run' ? runningVo2(speed, incline) : walkingVo2(speed, incline)
    return kcalFromVo2(vo2, weightKg, minutes)
  }

  const met = CARDIO_METS[input.type][effortOf(input.intensity)]
  return met * weightKg * (minutes / 60)
}

/** Average speed in km/h from distance and time. */
export function speedKmh(
  distanceKm: number | null | undefined,
  minutes: number | null | undefined,
): number | undefined {
  if (!distanceKm || !minutes || distanceKm <= 0 || minutes <= 0) return undefined
  return distanceKm / (minutes / 60)
}

/** Running pace in seconds per km. */
export function paceSecPerKm(
  distanceKm: number | null | undefined,
  minutes: number | null | undefined,
): number | undefined {
  if (!distanceKm || !minutes || distanceKm <= 0 || minutes <= 0) return undefined
  return (minutes * 60) / distanceKm
}

/** Rowing split in seconds per 500 m. */
export function rowingSplitSec(
  distanceKm: number | null | undefined,
  minutes: number | null | undefined,
): number | undefined {
  const pace = paceSecPerKm(distanceKm, minutes)
  return pace === undefined ? undefined : pace / 2
}

/** Swim pace in seconds per 100 m. */
export function swimPaceSec(
  distanceKm: number | null | undefined,
  minutes: number | null | undefined,
): number | undefined {
  const pace = paceSecPerKm(distanceKm, minutes)
  return pace === undefined ? undefined : pace / 10
}

/** 272 → "4:32". */
export function formatClock(totalSeconds: number): string {
  const rounded = Math.round(totalSeconds)
  const minutes = Math.floor(rounded / 60)
  return `${minutes}:${String(rounded % 60).padStart(2, '0')}`
}
