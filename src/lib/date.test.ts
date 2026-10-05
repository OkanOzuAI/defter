import { describe, expect, it } from 'vitest'
import {
  addDays,
  dateInTimezone,
  dateRange,
  diffDays,
  formatDate,
  isDateStr,
  startOfWeek,
  weekday,
} from './date'

describe('dateInTimezone', () => {
  it('uses the local calendar day, not UTC', () => {
    // 22:30 UTC on Oct 5 is already 01:30 on Oct 6 in Istanbul (UTC+3)
    const lateEvening = new Date('2026-10-05T22:30:00Z')
    expect(dateInTimezone(lateEvening, 'Europe/Istanbul')).toBe('2026-10-06')
    expect(dateInTimezone(lateEvening, 'UTC')).toBe('2026-10-05')
    expect(dateInTimezone(lateEvening, 'America/Los_Angeles')).toBe('2026-10-05')
  })
})

describe('date arithmetic', () => {
  it('adds days across month, year and DST boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30')
    expect(addDays('2026-10-06', -7)).toBe('2026-09-29')
  })

  it('diffs whole days', () => {
    expect(diffDays('2026-10-01', '2026-10-06')).toBe(5)
    expect(diffDays('2026-10-06', '2026-10-01')).toBe(-5)
    expect(diffDays('2026-03-28', '2026-03-30')).toBe(2)
  })

  it('knows ISO weekdays', () => {
    expect(weekday('2026-10-05')).toBe(1) // Monday
    expect(weekday('2026-10-06')).toBe(2)
    expect(weekday('2026-10-11')).toBe(7) // Sunday
    expect(startOfWeek('2026-10-11')).toBe('2026-10-05')
    expect(startOfWeek('2026-10-05')).toBe('2026-10-05')
  })

  it('builds inclusive ranges', () => {
    expect(dateRange('2026-10-30', '2026-11-01')).toEqual([
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
    ])
  })

  it('validates date strings', () => {
    expect(isDateStr('2026-10-06')).toBe(true)
    expect(isDateStr('2026-02-30')).toBe(false)
    expect(isDateStr('2026-1-1')).toBe(false)
  })
})

describe('formatDate', () => {
  it('formats in the active locale without shifting the day', () => {
    expect(formatDate('2026-10-06', 'tr')).toBe('6 Ekim Salı')
    expect(formatDate('2026-10-06', 'en')).toBe('Tuesday, October 6')
  })
})
