/** Pure conversions between saved workouts (templates), sessions and the draft. */
import type { Exercise } from '../data/exercises'
import { e1rm } from '../lib/calc'
import type { DateStr } from '../lib/date'
import { formatNumber, parseNumber } from '../lib/number'
import { newDraft, orderedSets } from './draft'
import { sortSetRows } from './history'
import type {
  CopyMode,
  Draft,
  DraftSet,
  SessionRow,
  SetRow,
  Technique,
  TemplateItem,
  TemplateSet,
} from './types'

const text = (value: number | null) => (value === null ? '' : formatNumber(value, 'en', 2))

/** Everything in the editor becomes the template, completed or not. */
export function itemsFromDraft(draft: Draft): TemplateItem[] {
  return draft.exercises.map((exercise) => ({
    exercise_id: exercise.exercise_id,
    superset_group: exercise.superset_group,
    note: exercise.note.trim(),
    tempo: exercise.tempo.trim(),
    sets: orderedSets(exercise).map((set) => ({
      set_index: set.set_index,
      side: set.side,
      set_type: set.set_type,
      weight: parseNumber(set.weight) ?? null,
      reps: toReps(set.reps),
      rir: set.rir,
      failure: set.failure,
      techniques: set.techniques,
    })),
  }))
}

function toReps(value: string): number | null {
  const reps = parseNumber(value)
  return reps === undefined ? null : Math.round(reps)
}

/** A finished session as template items: its exercises in order with the sets that were done. */
export function itemsFromSession(session: SessionRow, sets: SetRow[]): TemplateItem[] {
  const done = sortSetRows(sets.filter((row) => row.done))
  const positions = [...new Set(done.map((row) => row.exercise_position))]
  return positions.map((position) => {
    const rows = done.filter((row) => row.exercise_position === position)
    const info = session.exercises.find((e) => e.position === position)
    return {
      exercise_id: rows[0].exercise_id,
      superset_group: rows[0].superset_group,
      note: info?.note ?? '',
      tempo: info?.tempo ?? '',
      sets: rows.map((row) => ({
        set_index: row.set_index,
        side: row.side,
        set_type: row.set_type,
        weight: row.weight,
        reps: row.reps,
        rir: row.rir,
        failure: row.failure,
        techniques: row.techniques,
      })),
    }
  })
}

/**
 * Fills a template's sets with what was actually done the last time it was used.
 * The template decides the exercises and set layout (so a one-off swap does not stick);
 * a set with no counterpart last time keeps the template's stored values.
 */
export function withLastValues(items: TemplateItem[], lastSets: SetRow[]): TemplateItem[] {
  const done = lastSets.filter((row) => row.done)
  const used = new Set<number>()
  return items.map((item) => {
    // The same exercise can appear twice in a workout: pair them up in order.
    const position = done.find(
      (row) => row.exercise_id === item.exercise_id && !used.has(row.exercise_position),
    )?.exercise_position
    if (position === undefined) return item
    used.add(position)
    const rows = done.filter((row) => row.exercise_position === position)
    return {
      ...item,
      sets: item.sets.map((set): TemplateSet => {
        const last = rows.find((row) => row.set_index === set.set_index && row.side === set.side)
        if (!last) return set
        return {
          ...set,
          weight: last.weight,
          reps: last.reps,
          rir: last.rir,
          failure: last.failure,
          techniques: last.techniques,
        }
      }),
    }
  })
}

/**
 * Builds a new draft from template items.
 * - 'values': weight / reps / RIR are prefilled as real values to confirm or tweak.
 * - 'structure': empty rows; the old values only appear as greyed-out hints.
 */
export function draftFromItems(
  items: TemplateItem[],
  mode: CopyMode,
  options: { date: DateStr; name: string; templateId: string | null },
): Draft {
  const draft = newDraft(options.date, options.name)
  return {
    ...draft,
    template_id: options.templateId,
    exercises: items.map((item) => ({
      key: crypto.randomUUID(),
      exercise_id: item.exercise_id,
      superset_group: item.superset_group,
      note: item.note,
      tempo: item.tempo,
      sets: item.sets.map((set): DraftSet => {
        const base = {
          id: crypto.randomUUID(),
          set_index: set.set_index,
          side: set.side,
          set_type: set.set_type,
          done: false,
        }
        if (mode === 'values') {
          return {
            ...base,
            weight: text(set.weight),
            reps: text(set.reps),
            rir: set.rir,
            failure: set.failure,
            techniques: set.techniques as Technique[],
          }
        }
        return {
          ...base,
          weight: '',
          reps: '',
          rir: null,
          failure: 'none',
          techniques: [],
          hint: { weight: set.weight, reps: set.reps },
        }
      }),
    })),
  }
}

/** Replaces one exercise of a template, keeping its set layout but not its values. */
export function swapInTemplate(
  items: TemplateItem[],
  index: number,
  exerciseId: string,
  unilateral: boolean,
): TemplateItem[] {
  return items.map((item, i) => {
    if (i !== index) return item
    const count = new Set(item.sets.map((set) => set.set_index)).size
    const blank = (set_index: number, side: TemplateSet['side']): TemplateSet => ({
      set_index,
      side,
      set_type: 'working',
      weight: null,
      reps: null,
      rir: null,
      failure: 'none',
      techniques: [],
    })
    const sets = Array.from({ length: count }, (_, n) =>
      unilateral ? [blank(n, 'L'), blank(n, 'R')] : [blank(n, null)],
    ).flat()
    return { ...item, exercise_id: exerciseId, sets }
  })
}

// --- Personal records -------------------------------------------------------

export type PR =
  | { kind: 'e1rm'; exercise_id: string; value: number }
  | { kind: 'weight'; exercise_id: string; value: number }
  | { kind: 'reps'; exercise_id: string; value: number; weight: number }

type Lookup = (id: string) => Pick<Exercise, 'loadMode'>

/**
 * Records set in a session compared with everything logged before it:
 * best e1RM, heaviest weight, and most reps at a weight used before.
 * An exercise with no earlier history has nothing to beat, so it reports none.
 */
export function findPRs(
  sessionSets: SetRow[],
  earlierSets: SetRow[],
  getExercise: Lookup,
  bodyweight?: number,
): PR[] {
  const counted = (row: SetRow) => row.done && row.set_type !== 'warmup' && (row.reps ?? 0) > 0
  const now = sessionSets.filter(counted)
  const before = earlierSets.filter(counted)
  const prs: PR[] = []

  for (const exercise_id of [...new Set(now.map((row) => row.exercise_id))]) {
    const mine = now.filter((row) => row.exercise_id === exercise_id)
    const prior = before.filter((row) => row.exercise_id === exercise_id)
    if (prior.length === 0) continue

    const { loadMode } = getExercise(exercise_id)
    const best = (rows: SetRow[]) =>
      Math.max(0, ...rows.map((row) => e1rm(row, { loadMode, bodyweight }) ?? 0))
    const bestNow = best(mine)
    if (bestNow > 0 && best(prior) > 0 && bestNow > best(prior)) {
      prs.push({ kind: 'e1rm', exercise_id, value: bestNow })
    }

    const heaviest = (rows: SetRow[]) => Math.max(0, ...rows.map((row) => row.weight ?? 0))
    const weightNow = heaviest(mine)
    if (weightNow > heaviest(prior)) prs.push({ kind: 'weight', exercise_id, value: weightNow })

    // Most reps at a weight that was used before; report the heaviest such weight.
    const repsAt = (rows: SetRow[], weight: number) =>
      Math.max(0, ...rows.filter((row) => row.weight === weight).map((row) => row.reps ?? 0))
    const weights = [...new Set(mine.map((row) => row.weight ?? 0))].sort((a, b) => b - a)
    for (const weight of weights) {
      const priorReps = repsAt(prior, weight)
      if (weight > 0 && priorReps > 0 && repsAt(mine, weight) > priorReps) {
        prs.push({ kind: 'reps', exercise_id, value: repsAt(mine, weight), weight })
        break
      }
    }
  }
  return prs
}
