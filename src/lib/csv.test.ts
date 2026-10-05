import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'

describe('toCsv', () => {
  it('writes a header and one line per row', () => {
    expect(
      toCsv([{ date: '2026-10-06', weight: 82.5, note: null }], ['date', 'weight', 'note']),
    ).toBe('date,weight,note\r\n2026-10-06,82.5,\r\n')
  })

  it('quotes commas, quotes and line breaks', () => {
    expect(toCsv([{ a: 'x, y', b: 'say "hi"', c: 'two\nlines' }], ['a', 'b', 'c'])).toBe(
      'a,b,c\r\n"x, y","say ""hi""","two\nlines"\r\n',
    )
  })

  it('flattens arrays and objects, and ignores unknown columns', () => {
    expect(
      toCsv([{ t: ['rest_pause', 'partials'], d: { floors: 60 } }], ['t', 'd', 'missing']),
    ).toBe('t,d,missing\r\nrest_pause|partials,"{""floors"":60}",\r\n')
  })
})
