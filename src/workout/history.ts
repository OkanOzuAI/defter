/** Reading helpers over stored sets: last performance, best e1RM, short set text. */
import type { Exercise } from '../data/exercises'
import type { Lang, TFn } from '../i18n'
import { e1rm, rirToRpe } from '../lib/calc'
import { formatNumber } from '../lib/number'
import type { SetRow } from './types'

export type IntensityDisplay = 'rir' | 'rpe'

const sideOrder = (side: SetRow['side']) => (side === 'R' ? 1 : 0)

export function sortSetRows(rows: SetRow[]): SetRow[] {
  return [...rows].sort(
    (a, b) =>
      a.exercise_position - b.exercise_position ||
      a.set_index - b.set_index ||
      sideOrder(a.side) - sideOrder(b.side),
  )
}

/**
 * From rows sorted newest first: for each exercise, the sets of the most recent
 * session that is not the one being logged.
 */
export function lastSessionSets(
  rowsNewestFirst: SetRow[],
  excludeSessionId: string,
): Record<string, SetRow[]> {
  const sessionOf = new Map<string, string>()
  const result: Record<string, SetRow[]> = {}
  for (const row of rowsNewestFirst) {
    if (row.session_id === excludeSessionId || !row.done) continue
    if (!sessionOf.has(row.exercise_id)) sessionOf.set(row.exercise_id, row.session_id)
    if (sessionOf.get(row.exercise_id) !== row.session_id) continue
    ;(result[row.exercise_id] ??= []).push(row)
  }
  for (const id of Object.keys(result)) result[id] = sortSetRows(result[id])
  return result
}

export function bestE1rm(
  rows: SetRow[],
  exercise: Pick<Exercise, 'loadMode'>,
  bodyweight: number | undefined,
): number | undefined {
  let best: number | undefined
  for (const row of rows) {
    if (row.set_type === 'warmup') continue
    const value = e1rm(row, { loadMode: exercise.loadMode, bodyweight })
    if (value !== undefined && (best === undefined || value > best)) best = value
  }
  return best
}

/** "R2", "RPE 8", "F" (failure), or "" when nothing was logged. */
export function intensityText(
  set: Pick<SetRow, 'rir' | 'failure'>,
  display: IntensityDisplay,
  t: TFn,
): string {
  if (set.failure === 'failure') return t('set.failureShort')
  const near = set.failure === 'near' ? ` ${t('set.nearShort')}` : ''
  if (set.rir === null) return near.trim()
  const value =
    display === 'rpe' ? `RPE ${rirToRpe(set.rir)}` : `R${set.rir}${set.rir >= 5 ? '+' : ''}`
  return value + near
}

/** "80×8 R2", "77,5×8 F", "Sol 40×12 R1". */
export function setText(
  set: Pick<SetRow, 'weight' | 'reps' | 'rir' | 'failure' | 'side'>,
  lang: Lang,
  display: IntensityDisplay,
  t: TFn,
): string {
  const side = set.side ? `${t(`side.${set.side}`)} ` : ''
  const weight = set.weight === null ? '–' : formatNumber(set.weight, lang, 2)
  const reps = set.reps === null ? '–' : String(set.reps)
  const intensity = intensityText(set, display, t)
  return `${side}${weight}×${reps}${intensity ? ` ${intensity}` : ''}`
}
