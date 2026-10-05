/** Pure operations on the workout draft. No storage, no network: easy to test. */
import type { Failure } from '../lib/calc'
import type { DateStr } from '../lib/date'
import { formatNumber, parseNumber } from '../lib/number'
import type { Draft, DraftExercise, DraftSet, SessionRow, SetRow, Side, Technique } from './types'

const uuid = () => crypto.randomUUID()

export function newDraft(date: DateStr, name = ''): Draft {
  return {
    id: uuid(),
    date,
    name,
    template_id: null,
    started_at: new Date().toISOString(),
    ended_at: null,
    note: '',
    exercises: [],
    rest: null,
    editing: false,
    originalSetIds: [],
  }
}

export function newSet(set_index: number, side: Side = null): DraftSet {
  return {
    id: uuid(),
    set_index,
    side,
    set_type: 'working',
    weight: '',
    reps: '',
    rir: null,
    failure: 'none',
    techniques: [],
    done: false,
  }
}

/** One row, or an L + R pair for single-arm / single-leg exercises. */
function newSetGroup(set_index: number, unilateral: boolean): DraftSet[] {
  return unilateral ? [newSet(set_index, 'L'), newSet(set_index, 'R')] : [newSet(set_index)]
}

const setIndexes = (sets: DraftSet[]) => [...new Set(sets.map((s) => s.set_index))].sort(byNumber)
const byNumber = (a: number, b: number) => a - b

/** Close gaps left by a deleted set while keeping L/R rows of one set together. */
function renumber(sets: DraftSet[]): DraftSet[] {
  const order = setIndexes(sets)
  return sets.map((set) => ({ ...set, set_index: order.indexOf(set.set_index) }))
}

const sideOrder = (side: Side) => (side === 'R' ? 1 : 0)

function sortSets(sets: DraftSet[]): DraftSet[] {
  return [...sets].sort(
    (a, b) => a.set_index - b.set_index || sideOrder(a.side) - sideOrder(b.side),
  )
}

// --- Exercises --------------------------------------------------------------

function mapExercise(
  draft: Draft,
  key: string,
  fn: (exercise: DraftExercise) => DraftExercise,
): Draft {
  return { ...draft, exercises: draft.exercises.map((e) => (e.key === key ? fn(e) : e)) }
}

export function addExercise(draft: Draft, exerciseId: string, unilateral: boolean): Draft {
  const exercise: DraftExercise = {
    key: uuid(),
    exercise_id: exerciseId,
    superset_group: null,
    note: '',
    tempo: '',
    sets: newSetGroup(0, unilateral),
  }
  return { ...draft, exercises: [...draft.exercises, exercise] }
}

export function removeExercise(draft: Draft, key: string): Draft {
  return tidySupersets({ ...draft, exercises: draft.exercises.filter((e) => e.key !== key) })
}

export function moveExercise(draft: Draft, key: string, direction: -1 | 1): Draft {
  const from = draft.exercises.findIndex((e) => e.key === key)
  const to = from + direction
  if (from < 0 || to < 0 || to >= draft.exercises.length) return draft
  const exercises = [...draft.exercises]
  ;[exercises[from], exercises[to]] = [exercises[to], exercises[from]]
  return { ...draft, exercises }
}

/** Puts another exercise in the slot. The set layout stays; logged values do not carry over. */
export function swapExercise(
  draft: Draft,
  key: string,
  exerciseId: string,
  unilateral: boolean,
): Draft {
  return mapExercise(draft, key, (exercise) => ({
    ...exercise,
    exercise_id: exerciseId,
    sets: setIndexes(exercise.sets).flatMap((_, index) => newSetGroup(index, unilateral)),
  }))
}

export function updateExercise(
  draft: Draft,
  key: string,
  patch: Partial<Pick<DraftExercise, 'note' | 'tempo'>>,
): Draft {
  return mapExercise(draft, key, (exercise) => ({ ...exercise, ...patch }))
}

// --- Supersets --------------------------------------------------------------

/** A group needs at least two neighbours; clear the letter from anything left alone. */
function tidySupersets(draft: Draft): Draft {
  const exercises = draft.exercises.map((exercise, i, all) => {
    const group = exercise.superset_group
    if (!group) return exercise
    const hasNeighbour =
      all[i - 1]?.superset_group === group || all[i + 1]?.superset_group === group
    return hasNeighbour ? exercise : { ...exercise, superset_group: null }
  })
  return { ...draft, exercises }
}

/** Links an exercise with the one after it, or unlinks them if they already are. */
export function toggleSupersetWithNext(draft: Draft, key: string): Draft {
  const index = draft.exercises.findIndex((e) => e.key === key)
  const current = draft.exercises[index]
  const next = draft.exercises[index + 1]
  if (!current || !next) return draft

  if (current.superset_group && current.superset_group === next.superset_group) {
    // Split the group after this exercise: everything below gets a fresh letter.
    const fresh = unusedGroup(draft)
    const old = current.superset_group
    const exercises = draft.exercises.map((e, i) =>
      i > index && e.superset_group === old ? { ...e, superset_group: fresh } : e,
    )
    return tidySupersets({ ...draft, exercises })
  }

  const group = current.superset_group ?? next.superset_group ?? unusedGroup(draft)
  const exercises = draft.exercises.map((e, i) =>
    i === index || i === index + 1 ? { ...e, superset_group: group } : e,
  )
  return { ...draft, exercises }
}

function unusedGroup(draft: Draft): string {
  const used = new Set(draft.exercises.map((e) => e.superset_group))
  for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') if (!used.has(letter)) return letter
  return 'Z'
}

/** "A1", "A2" … or null when the exercise is not in a superset. */
export function supersetLabel(draft: Draft, key: string): string | null {
  const exercise = draft.exercises.find((e) => e.key === key)
  if (!exercise?.superset_group) return null
  const group = draft.exercises.filter((e) => e.superset_group === exercise.superset_group)
  return `${exercise.superset_group}${group.findIndex((e) => e.key === key) + 1}`
}

/** In a superset the rest timer only starts after the last exercise of the round. */
export function startsRest(draft: Draft, key: string): boolean {
  const index = draft.exercises.findIndex((e) => e.key === key)
  const exercise = draft.exercises[index]
  if (!exercise?.superset_group) return true
  return draft.exercises[index + 1]?.superset_group !== exercise.superset_group
}

// --- Sets -------------------------------------------------------------------

/** "Set sayısı": typing a number creates that many sets. Completed sets are never removed. */
export function setSetCount(draft: Draft, key: string, count: number, unilateral: boolean): Draft {
  const target = Math.max(0, Math.min(30, Math.floor(count)))
  return mapExercise(draft, key, (exercise) => {
    let sets = renumber(exercise.sets)
    let current = setIndexes(sets).length
    while (current < target) {
      sets = [...sets, ...newSetGroup(current, unilateral)]
      current += 1
    }
    while (current > target) {
      const last = current - 1
      if (sets.some((s) => s.set_index === last && s.done)) break
      sets = sets.filter((s) => s.set_index !== last)
      current -= 1
    }
    return { ...exercise, sets }
  })
}

export function setCount(exercise: DraftExercise): number {
  return setIndexes(exercise.sets).length
}

/**
 * "+ Set". For unilateral exercises this adds an L + R pair; pass a side to add an
 * extra set for that side only.
 */
export function addSet(draft: Draft, key: string, unilateral: boolean, side?: 'L' | 'R'): Draft {
  return mapExercise(draft, key, (exercise) => {
    const index = setIndexes(exercise.sets).length
    const sets = renumber(exercise.sets)
    const added = side ? [newSet(index, side)] : newSetGroup(index, unilateral)
    // A new set starts from the type of the one before it (e.g. more back-off sets).
    const previous = sortSets(sets).at(-1)
    const typed = added.map((s) => ({ ...s, set_type: previous?.set_type ?? s.set_type }))
    return { ...exercise, sets: [...sets, ...typed] }
  })
}

export function removeSet(draft: Draft, key: string, setId: string): Draft {
  return mapExercise(draft, key, (exercise) => ({
    ...exercise,
    sets: renumber(exercise.sets.filter((s) => s.id !== setId)),
  }))
}

export function updateSet(
  draft: Draft,
  key: string,
  setId: string,
  fn: (set: DraftSet) => DraftSet,
): Draft {
  return mapExercise(draft, key, (exercise) => ({
    ...exercise,
    sets: exercise.sets.map((s) => (s.id === setId ? fn(s) : s)),
  }))
}

export function orderedSets(exercise: DraftExercise): DraftSet[] {
  return sortSets(exercise.sets)
}

/** Tapping the selected RIR again clears it. */
export function withRir(set: DraftSet, rir: number): DraftSet {
  return { ...set, rir: set.rir === rir ? null : rir }
}

/**
 * Failure chips. Failure sets RIR to 0; near failure sets RIR to 1 only if it is empty.
 * Tapping the active chip removes it. RIR stays editable afterwards.
 */
export function withFailure(set: DraftSet, chip: Exclude<Failure, 'none'>): DraftSet {
  if (set.failure === chip) return { ...set, failure: 'none' }
  if (chip === 'failure') return { ...set, failure: 'failure', rir: 0 }
  return { ...set, failure: 'near', rir: set.rir ?? 1 }
}

export function withTechnique(set: DraftSet, technique: Technique): DraftSet {
  const has = set.techniques.includes(technique)
  return {
    ...set,
    techniques: has
      ? set.techniques.filter((t) => t !== technique)
      : [...set.techniques, technique],
  }
}

// --- To and from stored rows ------------------------------------------------

export function toSessionRow(draft: Draft, userId: string): SessionRow {
  return {
    id: draft.id,
    user_id: userId,
    date: draft.date,
    name: draft.name.trim() || null,
    template_id: draft.template_id,
    started_at: draft.started_at,
    ended_at: draft.ended_at,
    note: draft.note.trim() || null,
    exercises: draft.exercises.map((exercise, position) => ({
      exercise_id: exercise.exercise_id,
      position,
      superset_group: exercise.superset_group,
      note: exercise.note.trim(),
      tempo: exercise.tempo.trim(),
    })),
  }
}

/** Only completed sets are stored; open rows are scratch space. */
export function toSetRows(draft: Draft, userId: string): SetRow[] {
  return draft.exercises.flatMap((exercise, position) =>
    orderedSets(exercise)
      .filter((set) => set.done)
      .map((set) => ({
        id: set.id,
        user_id: userId,
        session_id: draft.id,
        date: draft.date,
        exercise_id: exercise.exercise_id,
        exercise_position: position,
        superset_group: exercise.superset_group,
        set_index: set.set_index,
        side: set.side,
        set_type: set.set_type,
        weight: parseNumber(set.weight) ?? null,
        reps: toReps(set.reps),
        rir: set.rir,
        failure: set.failure,
        techniques: set.techniques,
        done: true,
      })),
  )
}

function toReps(text: string): number | null {
  const value = parseNumber(text)
  return value === undefined ? null : Math.round(value)
}

const toText = (value: number | null) => (value === null ? '' : formatNumber(value, 'en', 2))

/** Loads a saved session back into the editor. */
export function draftFromSession(session: SessionRow, sets: SetRow[]): Draft {
  const positions = [...new Set(sets.map((s) => s.exercise_position))].sort(byNumber)
  const meta = new Map(session.exercises.map((e) => [e.position, e]))

  // Exercises come from the session's list, plus any position that only has sets.
  const allPositions = [...new Set([...meta.keys(), ...positions])].sort(byNumber)
  const exercises: DraftExercise[] = allPositions.flatMap((position) => {
    const own = sets.filter((s) => s.exercise_position === position)
    const info = meta.get(position)
    const exercise_id = info?.exercise_id ?? own[0]?.exercise_id
    if (!exercise_id) return []
    return [
      {
        key: uuid(),
        exercise_id,
        superset_group: info?.superset_group ?? own[0]?.superset_group ?? null,
        note: info?.note ?? '',
        tempo: info?.tempo ?? '',
        sets: sortSets(
          own.map((s) => ({
            id: s.id,
            set_index: s.set_index,
            side: s.side,
            set_type: s.set_type,
            weight: toText(s.weight),
            reps: toText(s.reps),
            rir: s.rir,
            failure: s.failure,
            techniques: s.techniques as Technique[],
            done: s.done,
          })),
        ),
      },
    ]
  })

  return {
    id: session.id,
    date: session.date,
    name: session.name ?? '',
    template_id: session.template_id,
    started_at: session.started_at ?? new Date().toISOString(),
    ended_at: session.ended_at,
    note: session.note ?? '',
    exercises,
    rest: null,
    editing: true,
    originalSetIds: sets.map((s) => s.id),
  }
}
