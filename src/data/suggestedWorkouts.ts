/**
 * Ready-made saved workouts a user can choose to add. Nothing here is applied
 * automatically: each one is copied into the user's own saved workouts only when
 * they tap "Ekle", and is fully editable afterwards.
 */
import type { Lang } from '../i18n'
import type { TemplateItem, TemplateRow, TemplateSet } from '../workout/types'

type Effort =
  /** Stop with this many reps in reserve. */
  | { rir: number }
  /** A range such as RIR 1–2: left for the user to fill in per set. */
  | { rirRange: [number, number] }
  | { failure: true }
  /** "RIR 1 – failure": early sets RIR 1, the last one to failure. */
  | { rirThenFailure: number }

type Line = {
  exercise: string
  sets: number
  reps: [number, number]
  effort: Effort
  /** Exercises sharing a letter are done back to back. */
  superset?: string
}

export type SuggestedWorkout = {
  key: string
  name: Record<Lang, string>
  lines: Line[]
}

const rir = (value: number): Effort => ({ rir: value })
const failure: Effort = { failure: true }
const rir1ToFailure: Effort = { rirThenFailure: 1 }
const rir1to2: Effort = { rirRange: [1, 2] }

const line = (
  exercise: string,
  sets: number,
  reps: [number, number],
  effort: Effort,
  superset?: string,
): Line => ({ exercise, sets, reps, effort, superset })

export const SUGGESTED_WORKOUTS: SuggestedWorkout[] = [
  {
    key: 'push-chest',
    name: { tr: 'Push (göğüsle başlayan)', en: 'Push (chest first)' },
    lines: [
      line('plate-loaded-chest-press', 2, [5, 6], rir(1)),
      line('smith-low-incline-bench-press', 2, [5, 6], rir(1)),
      line('chest-fly-machine', 1, [6, 8], failure),
      line('machine-shoulder-press', 2, [6, 8], rir(1)),
      line('lateral-raise', 3, [8, 10], failure),
      line('triceps-pushdown', 2, [6, 8], failure),
      line('overhead-rope-extension', 2, [8, 10], failure),
    ],
  },
  {
    key: 'pull-lats',
    name: { tr: 'Pull (lat pulldown ile başlayan)', en: 'Pull (lat pulldown first)' },
    lines: [
      line('lat-pulldown', 2, [6, 8], rir1ToFailure),
      line('plate-loaded-wide-grip-row', 3, [6, 8], rir1ToFailure),
      line('cable-row', 1, [8, 10], failure),
      line('incline-db-curl', 2, [6, 8], failure),
      line('cable-curl', 2, [6, 8], failure),
      line('hammer-curl', 2, [8, 10], failure, 'A'),
      line('reverse-barbell-curl', 2, [8, 10], failure, 'A'),
    ],
  },
  {
    key: 'legs',
    name: { tr: 'Legs (bacak)', en: 'Legs' },
    lines: [
      line('leg-press', 2, [6, 8], rir1to2),
      line('smith-squat', 2, [6, 8], rir1to2),
      line('leg-extension', 2, [8, 10], failure),
      line('seated-leg-curl', 3, [8, 10], rir(1)),
    ],
  },
  {
    key: 'push-shoulders',
    name: { tr: 'Push (omuzla başlayan)', en: 'Push (shoulders first)' },
    lines: [
      line('machine-shoulder-press', 2, [6, 8], rir(1)),
      line('lateral-raise', 3, [8, 10], failure),
      line('smith-low-incline-bench-press', 2, [5, 6], rir(1)),
      line('chest-fly-machine', 2, [6, 8], failure),
      line('cable-rear-delt-fly', 2, [8, 10], failure),
      line('triceps-pushdown', 2, [6, 8], failure),
      line('overhead-rope-extension', 2, [8, 10], failure),
    ],
  },
  {
    key: 'pull-legs',
    name: { tr: 'Pull (row ile başlayan) + bacak', en: 'Pull (row first) + legs' },
    lines: [
      line('plate-loaded-wide-grip-row', 3, [6, 8], rir1ToFailure),
      line('lat-pulldown', 3, [6, 8], rir1ToFailure),
      line('romanian-deadlift', 2, [5, 6], rir1to2),
      line('cable-curl', 2, [6, 8], failure),
      line('hammer-curl', 2, [8, 10], failure, 'A'),
      line('reverse-barbell-curl', 2, [8, 10], failure, 'A'),
      line('leg-extension', 2, [6, 8], failure),
      line('seated-leg-curl', 1, [8, 10], failure),
    ],
  },
]

const WORDS = {
  tr: { reps: 'tekrar', failure: 'tükeniş', lastToFailure: 'son set tükeniş' },
  en: { reps: 'reps', failure: 'failure', lastToFailure: 'last set to failure' },
}

/** "5–6 tekrar · RIR 1": shown under the exercise name, since sets store one rep count, not a range. */
export function targetNote(item: Line, lang: Lang): string {
  const w = WORDS[lang]
  const reps = `${item.reps[0]}–${item.reps[1]} ${w.reps}`
  const effort = item.effort
  if ('failure' in effort) return `${reps} · ${w.failure}`
  if ('rirRange' in effort) return `${reps} · RIR ${effort.rirRange[0]}–${effort.rirRange[1]}`
  if ('rirThenFailure' in effort)
    return `${reps} · RIR ${effort.rirThenFailure}, ${w.lastToFailure}`
  return `${reps} · RIR ${effort.rir}`
}

function setFor(item: Line, index: number): TemplateSet {
  const effort = item.effort
  const last = index === item.sets - 1
  const toFailure = 'failure' in effort || ('rirThenFailure' in effort && last)
  return {
    set_index: index,
    side: null,
    set_type: 'working',
    // Weight and reps are the user's to choose within the range in the note.
    weight: null,
    reps: null,
    rir: toFailure
      ? 0
      : 'rir' in effort
        ? effort.rir
        : 'rirThenFailure' in effort
          ? effort.rirThenFailure
          : null,
    failure: toFailure ? 'failure' : 'none',
    techniques: [],
  }
}

/** A suggestion as one of the user's own saved workouts. */
export function toTemplate(workout: SuggestedWorkout, lang: Lang, userId: string): TemplateRow {
  const items: TemplateItem[] = workout.lines.map((item) => ({
    exercise_id: item.exercise,
    superset_group: item.superset ?? null,
    note: targetNote(item, lang),
    tempo: '',
    sets: Array.from({ length: item.sets }, (_, index) => setFor(item, index)),
  }))
  return {
    id: crypto.randomUUID(),
    user_id: userId,
    name: workout.name[lang],
    note: null,
    // No day is assigned: which workout to do on which day is the user's call.
    weekdays: [],
    items,
  }
}
