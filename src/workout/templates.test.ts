import { describe, expect, it } from 'vitest'
import { addExercise, newDraft, setSetCount, toSessionRow, toSetRows, updateSet } from './draft'
import {
  draftFromItems,
  findPRs,
  itemsFromDraft,
  itemsFromSession,
  swapInTemplate,
  withLastValues,
} from './templates'
import type { Draft, SetRow, TemplateItem } from './types'

const USER = 'user-1'

/** A draft where every listed set is filled in and completed. */
function logged(plan: [exercise: string, unilateral: boolean, sets: [string, string][]][]): Draft {
  let draft = newDraft('2026-10-06', 'Push')
  for (const [id, unilateral, sets] of plan) {
    draft = addExercise(draft, id, unilateral)
    const key = draft.exercises.at(-1)!.key
    draft = setSetCount(draft, key, unilateral ? sets.length / 2 : sets.length, unilateral)
    draft.exercises.at(-1)!.sets.forEach((set, i) => {
      draft = updateSet(draft, key, set.id, (s) => ({
        ...s,
        weight: sets[i][0],
        reps: sets[i][1],
        rir: 2,
        done: true,
      }))
    })
  }
  return draft
}

const row = (over: Partial<SetRow>): SetRow => ({
  id: crypto.randomUUID(),
  user_id: USER,
  session_id: 's',
  date: '2026-10-01',
  exercise_id: 'barbell-flat-bench-press',
  exercise_position: 0,
  superset_group: null,
  set_index: 0,
  side: null,
  set_type: 'working',
  weight: 80,
  reps: 8,
  rir: 2,
  failure: 'none',
  techniques: [],
  done: true,
  ...over,
})

describe('templates', () => {
  const draft = logged([
    [
      'barbell-flat-bench-press',
      false,
      [
        ['80', '8'],
        ['77,5', '8'],
      ],
    ],
    [
      'single-arm-pec-deck',
      true,
      [
        ['40', '12'],
        ['40', '11'],
      ],
    ],
  ])
  const session = toSessionRow(draft, USER)
  const sets = toSetRows(draft, USER)

  it('saves a session as a template with its exercises, sets and values', () => {
    const items = itemsFromSession(session, sets)
    expect(items.map((i) => i.exercise_id)).toEqual([
      'barbell-flat-bench-press',
      'single-arm-pec-deck',
    ])
    expect(items[0].sets.map((s) => [s.weight, s.reps, s.rir])).toEqual([
      [80, 8, 2],
      [77.5, 8, 2],
    ])
    expect(items[1].sets.map((s) => s.side)).toEqual(['L', 'R'])
    expect(itemsFromDraft(draft)).toEqual(items)
  })

  it('"copy with values" prefills real values, not yet completed', () => {
    const copy = draftFromItems(itemsFromSession(session, sets), 'values', {
      date: '2026-10-13',
      name: 'Push',
      templateId: 't1',
    })
    expect(copy.id).not.toBe(draft.id)
    expect(copy).toMatchObject({ date: '2026-10-13', template_id: 't1', editing: false })
    const first = copy.exercises[0].sets[1]
    expect(first).toMatchObject({ weight: '77.5', reps: '8', rir: 2, done: false })
    expect(toSetRows(copy, USER)).toEqual([]) // nothing is stored until it is confirmed
  })

  it('"exercises only" leaves the rows empty and keeps old values as hints', () => {
    const copy = draftFromItems(itemsFromSession(session, sets), 'structure', {
      date: '2026-10-13',
      name: 'Push',
      templateId: null,
    })
    expect(copy.exercises[0].sets).toHaveLength(2)
    expect(copy.exercises[0].sets[0]).toMatchObject({
      weight: '',
      reps: '',
      rir: null,
      hint: { weight: 80, reps: 8 },
    })
  })

  it('prefers values from the last session and falls back to the template', () => {
    const template: TemplateItem[] = itemsFromSession(session, sets)
    const last = [
      row({ set_index: 0, weight: 82.5, reps: 7, rir: 1 }),
      // set 2 was skipped last time; pec deck was swapped for something else
      row({ exercise_id: 'pec-deck', exercise_position: 1, weight: 60, reps: 12 }),
    ]
    const merged = withLastValues(template, last)
    expect(merged[0].sets[0]).toMatchObject({ weight: 82.5, reps: 7, rir: 1 })
    expect(merged[0].sets[1]).toMatchObject({ weight: 77.5, reps: 8 })
    expect(merged[1].exercise_id).toBe('single-arm-pec-deck')
    expect(merged[1].sets[0]).toMatchObject({ weight: 40, reps: 12 })
  })

  it('swaps an exercise in a template keeping the number of sets', () => {
    const items = swapInTemplate(itemsFromSession(session, sets), 0, 'single-arm-db-press', true)
    expect(items[0].exercise_id).toBe('single-arm-db-press')
    expect(items[0].sets.map((s) => `${s.set_index}${s.side}`)).toEqual(['0L', '0R', '1L', '1R'])
    expect(items[0].sets.every((s) => s.weight === null)).toBe(true)
    expect(items[1].exercise_id).toBe('single-arm-pec-deck')
  })
})

describe('personal records', () => {
  const lookup = () => ({ loadMode: 'total' as const })
  const earlier = [row({ weight: 80, reps: 8, rir: 2 }), row({ weight: 85, reps: 5, rir: 1 })]

  it('finds e1RM, weight and reps-at-weight records', () => {
    const prs = findPRs(
      [
        row({ session_id: 'now', weight: 87.5, reps: 6, rir: 1 }),
        row({ session_id: 'now', weight: 80, reps: 9, rir: 1 }),
      ],
      earlier,
      lookup,
    )
    expect(prs).toContainEqual({
      kind: 'weight',
      exercise_id: 'barbell-flat-bench-press',
      value: 87.5,
    })
    expect(prs).toContainEqual({
      kind: 'reps',
      exercise_id: 'barbell-flat-bench-press',
      value: 9,
      weight: 80,
    })
    expect(prs.find((pr) => pr.kind === 'e1rm')?.value).toBeCloseTo(87.5 * (1 + 7 / 30), 6)
  })

  it('reports nothing when nothing was beaten', () => {
    expect(
      findPRs([row({ session_id: 'now', weight: 80, reps: 8, rir: 2 })], earlier, lookup),
    ).toEqual([])
  })

  it('ignores warm-ups and exercises with no earlier history', () => {
    expect(
      findPRs(
        [row({ session_id: 'now', weight: 120, reps: 3, set_type: 'warmup' })],
        earlier,
        lookup,
      ),
    ).toEqual([])
    expect(
      findPRs([row({ session_id: 'now', exercise_id: 'pec-deck', weight: 200 })], earlier, lookup),
    ).toEqual([])
  })
})
