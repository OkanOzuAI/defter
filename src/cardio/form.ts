/** The cardio entry form: which fields each type has, and conversion to a stored session. */
import type { CardioSession } from '../api/types'
import type { Lang } from '../i18n'
import {
  estimateCardioKcal,
  formatClock,
  kmhToMph,
  mphToKmh,
  paceSecPerKm,
  rowingSplitSec,
  speedKmh,
  swimPaceSec,
  type CardioType,
} from '../lib/calc'
import type { DateStr } from '../lib/date'
import { formatNumber, parseNumber, toInputValue } from '../lib/number'

export const TYPE_FIELDS = {
  walk: ['duration', 'distance', 'speed'],
  incline_walk: ['duration', 'speed', 'incline'],
  run: ['duration', 'distance', 'speed', 'incline'],
  bike: ['duration', 'distance', 'level', 'watts'],
  elliptical: ['duration', 'level'],
  stairmaster: ['duration', 'level', 'floors'],
  rowing: ['duration', 'distance'],
  swim: ['duration', 'distance'],
  jump_rope: ['duration'],
  hiit: ['duration', 'rounds', 'work_sec', 'rest_sec'],
  other: ['duration', 'distance'],
} as const satisfies Record<CardioType, readonly string[]>

export const COMMON_FIELDS = ['avg_hr', 'max_hr', 'intensity', 'kcal'] as const

export type CardioField = (typeof TYPE_FIELDS)[CardioType][number] | (typeof COMMON_FIELDS)[number]

/** Everything as typed. Unused fields for the chosen type are simply ignored. */
export type CardioForm = Record<CardioField, string> & {
  type: CardioType
  date: DateStr
  note: string
}

const ALL_FIELDS: CardioField[] = [
  'duration',
  'distance',
  'speed',
  'incline',
  'level',
  'watts',
  'floors',
  'rounds',
  'work_sec',
  'rest_sec',
  'avg_hr',
  'max_hr',
  'intensity',
  'kcal',
]

export function emptyForm(type: CardioType, date: DateStr): CardioForm {
  const blank = Object.fromEntries(ALL_FIELDS.map((field) => [field, ''])) as Record<
    CardioField,
    string
  >
  return { ...blank, type, date, note: '' }
}

/** Rowing and swimming distances are typed in metres, everything else in km. */
export const usesMetres = (type: CardioType) => type === 'rowing' || type === 'swim'

export type SpeedUnit = 'kmh' | 'mph'
type Context = { id: string; userId: string; speedUnit: SpeedUnit; weightKg: number | undefined }

const DETAIL_FIELDS = ['floors', 'rounds', 'work_sec', 'rest_sec'] as const

/**
 * Builds the row to store. Returns the name of the offending field when the form
 * cannot be saved. Machine kcal is used as entered; otherwise it is estimated and flagged.
 */
export function toSession(
  form: CardioForm,
  context: Context,
): CardioSession | { error: CardioField } {
  const fields: readonly string[] = [...TYPE_FIELDS[form.type], ...COMMON_FIELDS]
  const values = {} as Record<CardioField, number | null>
  for (const field of ALL_FIELDS) {
    const text = fields.includes(field) ? form[field].trim() : ''
    if (text === '') {
      values[field] = null
      continue
    }
    const value = parseNumber(text)
    if (value === undefined || value < 0) return { error: field }
    values[field] = value
  }
  if (!values.duration) return { error: 'duration' }
  if (values.intensity !== null && (values.intensity < 1 || values.intensity > 10)) {
    return { error: 'intensity' }
  }

  const distance_km =
    values.distance === null
      ? null
      : usesMetres(form.type)
        ? values.distance / 1000
        : values.distance
  const speed_kmh =
    values.speed === null
      ? null
      : context.speedUnit === 'mph'
        ? mphToKmh(values.speed)
        : values.speed

  const estimate = estimateCardioKcal(
    {
      type: form.type,
      durationMin: values.duration,
      distanceKm: distance_km,
      speedKmh: speed_kmh,
      inclinePct: values.incline,
      intensity: values.intensity,
    },
    context.weightKg,
  )
  const entered = values.kcal !== null

  const details: Record<string, number> = {}
  for (const field of DETAIL_FIELDS) {
    const value = values[field]
    if (value !== null) details[field] = value
  }

  return {
    id: context.id,
    user_id: context.userId,
    date: form.date,
    type: form.type,
    duration_min: values.duration,
    distance_km,
    speed_kmh,
    incline_pct: values.incline,
    level: values.level,
    watts: values.watts,
    avg_hr: values.avg_hr === null ? null : Math.round(values.avg_hr),
    max_hr: values.max_hr === null ? null : Math.round(values.max_hr),
    kcal: entered ? values.kcal : estimate === undefined ? null : Math.round(estimate),
    kcal_estimated: !entered && estimate !== undefined,
    intensity: values.intensity === null ? null : Math.round(values.intensity),
    details,
    note: form.note.trim() || null,
  }
}

/** A stored session back as form text, to edit it or repeat it. */
export function toForm(session: CardioSession, speedUnit: SpeedUnit, lang: Lang): CardioForm {
  const type = session.type as CardioType
  const text = (value: number | null | undefined, digits = 2) => toInputValue(value, lang, digits)
  return {
    ...emptyForm(type, session.date),
    duration: text(session.duration_min),
    distance: text(
      session.distance_km === null || !usesMetres(type)
        ? session.distance_km
        : session.distance_km * 1000,
      usesMetres(type) ? 0 : 2,
    ),
    speed: text(
      session.speed_kmh !== null && speedUnit === 'mph'
        ? kmhToMph(session.speed_kmh)
        : session.speed_kmh,
      1,
    ),
    incline: text(session.incline_pct),
    level: text(session.level),
    watts: text(session.watts),
    floors: text(session.details.floors),
    rounds: text(session.details.rounds),
    work_sec: text(session.details.work_sec),
    rest_sec: text(session.details.rest_sec),
    avg_hr: text(session.avg_hr),
    max_hr: text(session.max_hr),
    intensity: text(session.intensity),
    // An estimate is recalculated, not carried over as if the machine had shown it.
    kcal: session.kcal_estimated ? '' : text(session.kcal, 0),
    note: session.note ?? '',
  }
}

/** Computed figures for the list: pace for runs, /500 m for rowing, /100 m for swims, else speed. */
export function derivedText(session: CardioSession, speedUnit: SpeedUnit, lang: Lang): string {
  const { type, distance_km, duration_min } = session
  const speed = session.speed_kmh ?? speedKmh(distance_km, duration_min)

  if (type === 'rowing') {
    const split = rowingSplitSec(distance_km, duration_min)
    return split === undefined ? '' : `${formatClock(split)} /500 m`
  }
  if (type === 'swim') {
    const pace = swimPaceSec(distance_km, duration_min)
    return pace === undefined ? '' : `${formatClock(pace)} /100 m`
  }
  if (type === 'run') {
    const pace = speed ? 3600 / speed : paceSecPerKm(distance_km, duration_min)
    return pace === undefined ? '' : `${formatClock(pace)} /km`
  }
  if (!speed) return ''
  return speedUnit === 'mph'
    ? `${formatNumber(kmhToMph(speed), lang, 1)} mph`
    : `${formatNumber(speed, lang, 1)} km/h`
}
