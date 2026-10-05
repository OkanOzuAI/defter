import { useState } from 'react'
import { useProfile } from '../auth/useProfile'
import { Button, Message } from '../components/ui'
import { useT } from '../i18n'
import { addExercise } from './draft'
import { ExerciseCard } from './ExerciseCard'
import { ExercisePicker } from './ExercisePicker'
import { resolveExercise } from './exercises'
import { Glossary } from './Glossary'
import type { Draft, SetRow } from './types'

type Props = {
  draft: Draft
  apply: (fn: (draft: Draft) => Draft) => void
  lastSets?: Record<string, SetRow[]>
  bodyweight?: number
  /** Editing a saved workout: no completing, no rest timer. */
  planning?: boolean
  onSwapInTemplate?: (index: number, exerciseId: string, unilateral: boolean) => void
}

/** The exercise cards plus "add exercise": shared by the live session and the template editor. */
export function ExerciseList({
  draft,
  apply,
  lastSets = {},
  bodyweight,
  planning,
  ...rest
}: Props) {
  const t = useT()
  const { data: profile } = useProfile()
  const [picking, setPicking] = useState(false)
  const [glossary, setGlossary] = useState(false)
  const timed = !planning && !draft.editing

  return (
    <>
      {draft.exercises.length === 0 && <Message title={t('workout.noExercises')} />}

      {draft.exercises.map((item) => {
        const exercise = resolveExercise(item.exercise_id)
        const restSec = exercise.isCompound
          ? (profile?.rest_compound_sec ?? exercise.restSec)
          : (profile?.rest_isolation_sec ?? exercise.restSec)
        return (
          <ExerciseCard
            key={item.key}
            draft={draft}
            item={item}
            exercise={exercise}
            lastSets={lastSets[item.exercise_id] ?? []}
            bodyweight={bodyweight}
            display={profile?.intensity_display ?? 'rir'}
            restSec={timed ? restSec : 0}
            planning={planning}
            onSwapInTemplate={rest.onSwapInTemplate}
            apply={apply}
            onGlossary={() => setGlossary(true)}
          />
        )
      })}

      <Button variant="secondary" block onClick={() => setPicking(true)}>
        + {t('workout.addExercise')}
      </Button>

      {picking && (
        <ExercisePicker
          title={t('ex.pickTitle')}
          onClose={() => setPicking(false)}
          onPick={(exercise) => {
            apply((d) => addExercise(d, exercise.id, exercise.unilateral))
            setPicking(false)
          }}
        />
      )}
      {glossary && <Glossary onClose={() => setGlossary(false)} />}
    </>
  )
}
