import { describe, expect, it } from 'vitest'
import {
  addExercise,
  addSet,
  draftFromSession,
  newDraft,
  newSet,
  orderedSets,
  removeExercise,
  removeSet,
  setCount,
  setSetCount,
  startsRest,
  supersetLabel,
  swapExercise,
  toSessionRow,
  toSetRows,
  toggleSupersetWithNext,
  updateSet,
  withFailure,
  withRir,
  withTechnique,
} from './draft'
import type { Draft } from './types'

const USER = 'user-1'

function draftWith(...exercises: [id: string, unilateral: boolean][]): Draft {
  return exercises.reduce(
    (draft, [id, unilateral]) => addExercise(draft, id, unilateral),
    newDraft('2026-10-06'),
  )
}

describe('RIR and failure chips', () => {
  it('failure sets RIR to 0', () => {
    const set = withFailure({ ...newSet(0), rir: 3 }, 'failure')
    expect(set).toMatchObject({ failure: 'failure', rir: 0 })
  })

  it('near failure sets RIR to 1 only when RIR is empty', () => {
    expect(withFailure(newSet(0), 'near')).toMatchObject({ failure: 'near', rir: 1 })
    expect(withFailure({ ...newSet(0), rir: 2 }, 'near')).toMatchObject({ failure: 'near', rir: 2 })
  })

  it('keeps both editable: RIR can change after a chip, and a chip can be removed', () => {
    const failed = withFailure(newSet(0), 'failure')
    expect(withRir(failed, 1)).toMatchObject({ failure: 'failure', rir: 1 })
    expect(withFailure(failed, 'failure')).toMatchObject({ failure: 'none', rir: 0 })
    expect(withFailure(failed, 'near')).toMatchObject({ failure: 'near', rir: 0 })
  })

  it('clears RIR when the selected value is tapped again', () => {
    expect(withRir({ ...newSet(0), rir: 2 }, 2).rir).toBeNull()
    expect(withRir({ ...newSet(0), rir: 2 }, 3).rir).toBe(3)
  })

  it('toggles technique tags', () => {
    const tagged = withTechnique(newSet(0), 'rest_pause')
    expect(tagged.techniques).toEqual(['rest_pause'])
    expect(withTechnique(tagged, 'rest_pause').techniques).toEqual([])
  })
})

describe('set count', () => {
  it('creates as many rows as typed', () => {
    let draft = draftWith(['barbell-flat-bench-press', false])
    const key = draft.exercises[0].key
    draft = setSetCount(draft, key, 4, false)
    expect(draft.exercises[0].sets).toHaveLength(4)
    expect(draft.exercises[0].sets.map((s) => s.set_index)).toEqual([0, 1, 2, 3])
    draft = setSetCount(draft, key, 2, false)
    expect(setCount(draft.exercises[0])).toBe(2)
  })

  it('never removes a completed set when the count is lowered', () => {
    let draft = draftWith(['barbell-flat-bench-press', false])
    const key = draft.exercises[0].key
    draft = setSetCount(draft, key, 3, false)
    const second = draft.exercises[0].sets[1].id
    draft = updateSet(draft, key, second, (s) => ({ ...s, done: true }))
    draft = setSetCount(draft, key, 0, false)
    expect(setCount(draft.exercises[0])).toBe(2)
  })

  it('creates L + R pairs for unilateral exercises', () => {
    let draft = draftWith(['single-arm-pec-deck', true])
    const key = draft.exercises[0].key
    draft = setSetCount(draft, key, 3, true)
    const sets = orderedSets(draft.exercises[0])
    expect(sets.map((s) => `${s.set_index}${s.side}`)).toEqual(['0L', '0R', '1L', '1R', '2L', '2R'])
  })

  it('adds an extra set for one side only', () => {
    let draft = draftWith(['single-arm-pec-deck', true])
    const key = draft.exercises[0].key
    draft = addSet(draft, key, true, 'L')
    const sets = orderedSets(draft.exercises[0])
    expect(sets.map((s) => `${s.set_index}${s.side}`)).toEqual(['0L', '0R', '1L'])
    expect(setCount(draft.exercises[0])).toBe(2)
  })

  it('renumbers after a delete and keeps the new set type of the previous set', () => {
    let draft = draftWith(['barbell-flat-bench-press', false])
    const key = draft.exercises[0].key
    draft = setSetCount(draft, key, 3, false)
    const [first, , third] = draft.exercises[0].sets
    draft = updateSet(draft, key, third.id, (s) => ({ ...s, set_type: 'backoff' }))
    draft = removeSet(draft, key, first.id)
    expect(draft.exercises[0].sets.map((s) => s.set_index)).toEqual([0, 1])
    draft = addSet(draft, key, false)
    expect(orderedSets(draft.exercises[0]).at(-1)).toMatchObject({
      set_index: 2,
      set_type: 'backoff',
    })
  })
})

describe('supersets', () => {
  it('labels linked exercises A1 / A2 and unlinks again', () => {
    let draft = draftWith(['a', false], ['b', false], ['c', false])
    const [a, b, c] = draft.exercises.map((e) => e.key)
    draft = toggleSupersetWithNext(draft, a)
    expect(supersetLabel(draft, a)).toBe('A1')
    expect(supersetLabel(draft, b)).toBe('A2')
    expect(supersetLabel(draft, c)).toBeNull()
    expect(startsRest(draft, a)).toBe(false)
    expect(startsRest(draft, b)).toBe(true)
    expect(startsRest(draft, c)).toBe(true)

    draft = toggleSupersetWithNext(draft, b)
    expect(supersetLabel(draft, c)).toBe('A3')

    draft = toggleSupersetWithNext(draft, a)
    expect(supersetLabel(draft, a)).toBeNull()
    expect(supersetLabel(draft, b)).toBe('B1')
    expect(supersetLabel(draft, c)).toBe('B2')
  })

  it('drops the label when a partner is removed', () => {
    let draft = draftWith(['a', false], ['b', false])
    const [a, b] = draft.exercises.map((e) => e.key)
    draft = removeExercise(toggleSupersetWithNext(draft, a), b)
    expect(supersetLabel(draft, a)).toBeNull()
  })
})

describe('rows', () => {
  it('stores only completed sets, parsing comma decimals', () => {
    let draft = draftWith(['barbell-flat-bench-press', false])
    const key = draft.exercises[0].key
    draft = setSetCount(draft, key, 2, false)
    const [first] = draft.exercises[0].sets
    draft = updateSet(draft, key, first.id, (s) =>
      withFailure({ ...s, weight: '77,5', reps: '8', done: true }, 'failure'),
    )
    const rows = toSetRows(draft, USER)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      user_id: USER,
      session_id: draft.id,
      date: '2026-10-06',
      exercise_id: 'barbell-flat-bench-press',
      exercise_position: 0,
      weight: 77.5,
      reps: 8,
      rir: 0,
      failure: 'failure',
    })
    expect(toSessionRow(draft, USER).exercises).toEqual([
      {
        exercise_id: 'barbell-flat-bench-press',
        position: 0,
        superset_group: null,
        note: '',
        tempo: '',
      },
    ])
  })

  it('round-trips a saved session into the editor', () => {
    let draft = draftWith(['single-arm-pec-deck', true], ['pec-deck', false])
    const key = draft.exercises[0].key
    for (const set of draft.exercises[0].sets) {
      draft = updateSet(draft, key, set.id, (s) => ({ ...s, weight: '40', reps: '12', done: true }))
    }
    const session = toSessionRow(draft, USER)
    const sets = toSetRows(draft, USER)
    const loaded = draftFromSession(session, sets)
    expect(loaded.editing).toBe(true)
    expect(loaded.originalSetIds).toEqual(sets.map((s) => s.id))
    expect(loaded.exercises.map((e) => e.exercise_id)).toEqual(['single-arm-pec-deck', 'pec-deck'])
    expect(loaded.exercises[0].sets.map((s) => s.side)).toEqual(['L', 'R'])
    expect(loaded.exercises[0].sets[0]).toMatchObject({ weight: '40', reps: '12', done: true })
    expect(toSetRows(loaded, USER)).toEqual(sets)
  })

  it('swapping keeps the layout but not the logged values', () => {
    let draft = draftWith(['pec-deck', false])
    const key = draft.exercises[0].key
    draft = setSetCount(draft, key, 3, false)
    draft = updateSet(draft, key, draft.exercises[0].sets[0].id, (s) => ({ ...s, weight: '60' }))
    draft = swapExercise(draft, key, 'single-arm-pec-deck', true)
    expect(draft.exercises[0].exercise_id).toBe('single-arm-pec-deck')
    expect(draft.exercises[0].sets).toHaveLength(6)
    expect(draft.exercises[0].sets.every((s) => s.weight === '' && !s.done)).toBe(true)
  })
})
