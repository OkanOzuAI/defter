import { describe, expect, it } from 'vitest'
import { formatNumber, parseNumber, toInputValue } from './number'

describe('parseNumber', () => {
  it('accepts dot and comma decimals', () => {
    expect(parseNumber('82.5')).toBe(82.5)
    expect(parseNumber('82,5')).toBe(82.5)
    expect(parseNumber(' 100 ')).toBe(100)
    expect(parseNumber('0')).toBe(0)
    expect(parseNumber('.5')).toBe(0.5)
    expect(parseNumber('5.')).toBe(5)
    expect(parseNumber('-2,5')).toBe(-2.5)
    expect(parseNumber(7.25)).toBe(7.25)
  })

  it('returns undefined for empty or invalid input', () => {
    for (const bad of ['', '   ', 'abc', '8a', '1.2.3', '1,2,3', '1 000', '--1', ',', '.']) {
      expect(parseNumber(bad)).toBeUndefined()
    }
    expect(parseNumber(null)).toBeUndefined()
    expect(parseNumber(undefined)).toBeUndefined()
    expect(parseNumber(Number.NaN)).toBeUndefined()
  })
})

describe('formatNumber', () => {
  it('uses the locale decimal separator', () => {
    expect(formatNumber(82.5, 'tr')).toBe('82,5')
    expect(formatNumber(82.5, 'en')).toBe('82.5')
    expect(formatNumber(2500, 'en')).toBe('2500')
    expect(formatNumber(77.25, 'tr', 2)).toBe('77,25')
  })

  it('round-trips through parseNumber', () => {
    expect(parseNumber(toInputValue(77.5, 'tr'))).toBe(77.5)
    expect(toInputValue(null, 'tr')).toBe('')
  })
})
