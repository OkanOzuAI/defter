import { describe, expect, it } from 'vitest'
import { getLibraryExercise } from './exercises'
import { SUGGESTED_WORKOUTS, targetNote, toTemplate } from './suggestedWorkouts'

describe('suggested workouts', () => {
  it('only uses exercises that exist in the library', () => {
    for (const workout of SUGGESTED_WORKOUTS) {
      for (const line of workout.lines) {
        expect(getLibraryExercise(line.exercise), `${workout.key}: ${line.exercise}`).toBeDefined()
      }
    }
  })

  it('uses the exercise names of the original plan', () => {
    const names = new Set(
      SUGGESTED_WORKOUTS.flatMap((w) => w.lines.map((l) => getLibraryExercise(l.exercise)!.name)),
    )
    for (const name of [
      'Plate-Loaded Chest Press',
      'Chest Fly Machine',
      'Lateral Raise',
      'Triceps Pushdown',
      'Lat Pulldown',
      'Plate-Loaded Wide-Grip Row',
      'Cable Row',
      'Cable Curl',
      'Reverse Barbell Curl',
      'Leg Press',
      'Romanian Deadlift',
    ]) {
      expect(names, name).toContain(name)
    }
  })

  it('has five separate workouts with unique names', () => {
    expect(SUGGESTED_WORKOUTS.map((w) => w.key)).toEqual([
      'push-chest',
      'pull-lats',
      'legs',
      'push-shoulders',
      'pull-legs',
    ])
    expect(new Set(SUGGESTED_WORKOUTS.map((w) => w.name.tr)).size).toBe(5)
    expect(SUGGESTED_WORKOUTS.map((w) => w.lines.length)).toEqual([7, 7, 4, 7, 8])
  })

  it('becomes an editable saved workout with the right set counts and effort', () => {
    const push = toTemplate(SUGGESTED_WORKOUTS[0], 'tr', 'u')
    expect(push).toMatchObject({ name: 'Push (göğüsle başlayan)', weekdays: [], user_id: 'u' })
    expect(push.items.map((item) => item.sets.length)).toEqual([2, 2, 1, 2, 3, 2, 2])
    expect(push.items[0]).toMatchObject({
      exercise_id: 'plate-loaded-chest-press',
      note: '5–6 tekrar · RIR 1',
    })
    expect(push.items[0].sets[0]).toMatchObject({
      weight: null,
      reps: null,
      rir: 1,
      failure: 'none',
    })
    expect(push.items[2].sets[0]).toMatchObject({ rir: 0, failure: 'failure' })
  })

  it('handles RIR ranges, "RIR 1 to failure" and supersets', () => {
    const pull = toTemplate(SUGGESTED_WORKOUTS[1], 'en', 'u')
    expect(pull.items[1].note).toBe('6–8 reps · RIR 1, last set to failure')
    expect(pull.items[1].sets.map((s) => [s.rir, s.failure])).toEqual([
      [1, 'none'],
      [1, 'none'],
      [0, 'failure'],
    ])
    expect(pull.items.map((item) => item.superset_group)).toEqual([
      null,
      null,
      null,
      null,
      null,
      'A',
      'A',
    ])
    const legs = SUGGESTED_WORKOUTS[2]
    expect(targetNote(legs.lines[0], 'tr')).toBe('6–8 tekrar · RIR 1–2')
    expect(toTemplate(legs, 'tr', 'u').items[0].sets[0]).toMatchObject({
      rir: null,
      failure: 'none',
    })
  })
})
