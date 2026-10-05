import type { Lang } from '../i18n'

/** Accepts "82.5" and "82,5". Empty or invalid input → undefined. */
export function parseNumber(input: string | number | null | undefined): number | undefined {
  if (input === null || input === undefined) return undefined
  if (typeof input === 'number') return Number.isFinite(input) ? input : undefined
  const text = input.trim().replace(',', '.')
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(text)) return undefined
  const value = Number(text)
  return Number.isFinite(value) ? value : undefined
}

const localeOf: Record<Lang, string> = { tr: 'tr-TR', en: 'en-US' }

export function toLocale(lang: Lang): string {
  return localeOf[lang]
}

/** TR: 82,5 · EN: 82.5. Thousands separators are off so values stay easy to retype. */
export function formatNumber(value: number, lang: Lang, maxFractionDigits = 1): string {
  return new Intl.NumberFormat(localeOf[lang], {
    maximumFractionDigits: maxFractionDigits,
    useGrouping: false,
  }).format(value)
}

/** For prefilling inputs: the user's decimal separator, no trailing zeros. */
export function toInputValue(value: number | null | undefined, lang: Lang, maxFractionDigits = 2) {
  if (value === null || value === undefined) return ''
  return formatNumber(value, lang, maxFractionDigits)
}
