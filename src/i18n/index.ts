import { useCallback, useSyncExternalStore } from 'react'
import { en } from './en'
import { tr, type TKey } from './tr'

export type Lang = 'tr' | 'en'
export type { TKey }
export type TFn = (key: TKey, vars?: Record<string, string | number>) => string

const STORAGE_KEY = 'defter.lang'
const dicts = { tr, en }
const listeners = new Set<() => void>()

function readInitial(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'tr' || saved === 'en') return saved
  } catch {
    // storage unavailable (private mode): fall through to the browser language
  }
  if (typeof navigator !== 'undefined' && !navigator.language.toLowerCase().startsWith('tr')) {
    return 'en'
  }
  return 'tr'
}

let current: Lang = readInitial()
applyToDocument(current)

function applyToDocument(lang: Lang) {
  if (typeof document !== 'undefined') document.documentElement.lang = lang
}

export function getLang(): Lang {
  return current
}

export function setLang(lang: Lang) {
  if (lang === current) return
  current = lang
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // ignore: the choice still applies for this page load
  }
  applyToDocument(lang)
  listeners.forEach((fn) => fn())
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function translate(lang: Lang, key: TKey, vars?: Record<string, string | number>): string {
  const text = dicts[lang][key]
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  )
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang, getLang)
}

export function useT(): TFn {
  const lang = useLang()
  return useCallback<TFn>((key, vars) => translate(lang, key, vars), [lang])
}
