import type { Lang } from '../i18n'
import { toLocale } from './number'

/**
 * Dates are local `YYYY-MM-DD` strings in the user's timezone.
 * Nothing here uses toISOString(): that is UTC and shifts the day late in the evening.
 */
export type DateStr = string

export const DEFAULT_TIMEZONE = 'Europe/Istanbul'

export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE
  } catch {
    return DEFAULT_TIMEZONE
  }
}

let activeTimezone = browserTimezone()

/** Called when the profile loads so every "today" follows the user's saved timezone. */
export function setActiveTimezone(timezone: string | null | undefined) {
  activeTimezone = isValidTimezone(timezone) ? timezone : browserTimezone()
}

function isValidTimezone(timezone: string | null | undefined): timezone is string {
  if (!timezone) return false
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

export function toDateStr(year: number, month: number, day: number): DateStr {
  return `${year}-${pad(month)}-${pad(day)}`
}

/** The calendar date of `instant` as seen in `timezone`. */
export function dateInTimezone(instant: Date, timezone: string = activeTimezone): DateStr {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return toDateStr(get('year'), get('month'), get('day'))
}

export function today(timezone: string = activeTimezone): DateStr {
  return dateInTimezone(new Date(), timezone)
}

export function isDateStr(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const utc = new Date(Date.UTC(y, m - 1, d))
  return utc.getUTCFullYear() === y && utc.getUTCMonth() === m - 1 && utc.getUTCDate() === d
}

// Calendar arithmetic runs on UTC midnights, so DST never adds or drops a day.
function toUtc(date: DateStr): number {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function fromUtc(ms: number): DateStr {
  const utc = new Date(ms)
  return toDateStr(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate())
}

const DAY_MS = 86_400_000

export function addDays(date: DateStr, days: number): DateStr {
  return fromUtc(toUtc(date) + days * DAY_MS)
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function diffDays(from: DateStr, to: DateStr): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS)
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function weekday(date: DateStr): number {
  const day = new Date(toUtc(date)).getUTCDay()
  return day === 0 ? 7 : day
}

/** Monday of the week containing `date`. */
export function startOfWeek(date: DateStr): DateStr {
  return addDays(date, 1 - weekday(date))
}

/** Inclusive list of dates from `from` to `to`. */
export function dateRange(from: DateStr, to: DateStr): DateStr[] {
  const out: DateStr[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}

export function formatDate(
  date: DateStr,
  lang: Lang,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', weekday: 'long' },
): string {
  // Formatting the UTC midnight in UTC prints exactly the stored calendar date.
  return new Intl.DateTimeFormat(toLocale(lang), { ...options, timeZone: 'UTC' }).format(
    new Date(toUtc(date)),
  )
}
