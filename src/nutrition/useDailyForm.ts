import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { saveDailyLog } from '../api/dailyLogs'
import { isNetworkError } from '../api/errors'
import type { DailyLog } from '../api/types'
import { useLang } from '../i18n'
import { saltGToSodiumMg, sodiumMgToSaltG } from '../lib/calc'
import type { DateStr } from '../lib/date'
import { parseNumber, toInputValue } from '../lib/number'
import { useOnline } from '../lib/online'
import { dailyKey } from './hooks'

export const NUMBER_FIELDS = [
  'weight',
  'calories',
  'protein',
  'carbs',
  'fat',
  'fiber',
  'sodium_mg',
  'water_l',
  'sleep_h',
  'steps',
] as const
export type NumberField = (typeof NUMBER_FIELDS)[number]

/** Typed but not yet saved values. `salt_g` is only a second way of typing sodium. */
type Edits = Partial<Record<NumberField | 'salt_g' | 'energy' | 'note', string>>

const storageKey = (userId: string, date: DateStr) => `defter.daily.${userId}.${date}`

function readEdits(userId: string, date: DateStr): Edits {
  try {
    return JSON.parse(localStorage.getItem(storageKey(userId, date)) ?? '{}') as Edits
  } catch {
    return {}
  }
}

function writeEdits(userId: string, date: DateStr, edits: Edits) {
  try {
    if (Object.keys(edits).length === 0) localStorage.removeItem(storageKey(userId, date))
    else localStorage.setItem(storageKey(userId, date), JSON.stringify(edits))
  } catch {
    // typed values still live in memory
  }
}

const INTEGER_FIELDS: NumberField[] = ['steps']

function toPatch(edits: Edits): Partial<Omit<DailyLog, 'date'>> {
  const patch: Partial<Record<string, number | string | null>> = {}
  for (const field of NUMBER_FIELDS) {
    const text = edits[field]
    if (text === undefined) continue
    if (text.trim() === '') patch[field] = null
    else {
      const value = parseNumber(text)
      // An unreadable number is left in the form for the user to fix, not saved.
      if (value !== undefined && value >= 0) {
        patch[field] = INTEGER_FIELDS.includes(field) ? Math.round(value) : value
      }
    }
  }
  if (edits.energy !== undefined) patch.energy = edits.energy === '' ? null : Number(edits.energy)
  if (edits.note !== undefined) patch.note = edits.note.trim() || null
  return patch as Partial<Omit<DailyLog, 'date'>>
}

export type DailyFormStatus = 'saved' | 'pending' | 'offline' | 'error'

/**
 * One day's log as a form. Typed values are kept on the device until the server has
 * them, and are saved automatically shortly after typing stops or the connection returns.
 * Mount with `key={date}` so each day gets its own state.
 */
export function useDailyForm(userId: string, date: DateStr, server: DailyLog | undefined) {
  const lang = useLang()
  const online = useOnline()
  const queryClient = useQueryClient()
  const [edits, setEdits] = useState<Edits>(() => readEdits(userId, date))

  const mutation = useMutation({
    mutationFn: (sent: Edits) => saveDailyLog(date, toPatch(sent)),
    onSuccess: (_, sent) => {
      // Drop what was saved, unless it was changed again in the meantime.
      setEdits((current) => {
        const patch = toPatch(sent)
        const next = { ...current }
        for (const key of Object.keys(sent) as (keyof Edits)[]) {
          const stored = key === 'salt_g' ? 'sodium_mg' in patch : key in patch
          if (stored && current[key] === sent[key]) delete next[key]
        }
        writeEdits(userId, date, next)
        return next
      })
      void queryClient.invalidateQueries({ queryKey: dailyKey(userId) })
    },
  })
  const { mutate, isPending } = mutation

  const hasSavable = Object.keys(toPatch(edits)).length > 0
  useEffect(() => {
    if (!hasSavable || isPending || !online) return
    const timer = setTimeout(() => mutate(edits), 900)
    return () => clearTimeout(timer)
  }, [edits, hasSavable, isPending, online, mutate])

  const change = useCallback(
    (field: keyof Edits, text: string) => {
      setEdits((current) => {
        const next = { ...current, [field]: text }
        if (field === 'salt_g') {
          const salt = parseNumber(text)
          if (text.trim() === '') next.sodium_mg = ''
          else if (salt !== undefined) next.sodium_mg = String(Math.round(saltGToSodiumMg(salt)))
        }
        if (field === 'sodium_mg') delete next.salt_g
        writeEdits(userId, date, next)
        return next
      })
    },
    [userId, date],
  )

  /** What the input shows: the typed text, else the saved value in the user's number format. */
  function value(field: NumberField): string {
    return edits[field] ?? toInputValue(server?.[field], lang, 2)
  }

  /** The current number behind a field, typed or saved. */
  function number(field: NumberField): number | null {
    const text = edits[field]
    if (text === undefined) return server?.[field] ?? null
    return parseNumber(text) ?? null
  }

  function saltValue(): string {
    if (edits.salt_g !== undefined) return edits.salt_g
    const sodium = number('sodium_mg')
    return sodium === null ? '' : toInputValue(sodiumMgToSaltG(sodium), lang, 2)
  }

  const invalid = (field: NumberField | 'salt_g') => {
    const text = edits[field]
    return text !== undefined && text.trim() !== '' && parseNumber(text) === undefined
  }

  const dirty = Object.keys(edits).length > 0
  const failed = mutation.isError && !isNetworkError(mutation.error)
  const status: DailyFormStatus = !dirty
    ? 'saved'
    : !online
      ? 'offline'
      : failed && !isPending
        ? 'error'
        : 'pending'

  return {
    value,
    number,
    saltValue,
    invalid,
    change,
    status,
    energy: edits.energy !== undefined ? Number(edits.energy) || null : (server?.energy ?? null),
    note: edits.note ?? server?.note ?? '',
  }
}
