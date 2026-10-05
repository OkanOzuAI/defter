import { useState } from 'react'
import { Link } from 'react-router-dom'
import { findAlternatives, type Exercise } from '../data/exercises'
import { useLang, useT } from '../i18n'
import { parseNumber } from '../lib/number'
import {
  addSet,
  moveExercise,
  orderedSets,
  removeExercise,
  removeSet,
  setCount,
  setSetCount,
  startsRest,
  supersetLabel,
  swapExercise,
  toggleSupersetWithNext,
  updateExercise,
  updateSet,
} from './draft'
import { ExercisePicker } from './ExercisePicker'
import { bestE1rm, setText, type IntensityDisplay } from './history'
import { SetRowEditor } from './SetRowEditor'
import { primeAudio } from './sound'
import type { Draft, DraftExercise, DraftSet, SetRow } from './types'

type Props = {
  draft: Draft
  item: DraftExercise
  exercise: Exercise
  /** The user's own sets from the previous session with this exercise. */
  lastSets: SetRow[]
  bodyweight?: number
  display: IntensityDisplay
  restSec: number
  /** Editing a saved workout rather than logging a session. */
  planning?: boolean
  /** Set when the session came from a saved workout: offers to keep a swap in it. */
  onSwapInTemplate?: (index: number, exerciseId: string, unilateral: boolean) => void
  apply: (fn: (draft: Draft) => Draft) => void
  onGlossary: () => void
}

const action = 'min-h-11 rounded-lg border border-border px-3 text-sm text-text'
const field =
  'block min-h-11 w-full rounded-lg border border-border bg-surface-2 px-3 placeholder:text-muted/60 focus:border-accent focus:outline-none'

export function ExerciseCard(props: Props) {
  const { draft, item, exercise, lastSets, bodyweight, display, planning, apply } = props
  const t = useT()
  const lang = useLang()
  const [more, setMore] = useState(false)
  const [swapping, setSwapping] = useState(false)
  const [countText, setCountText] = useState<string | null>(null)

  const key = item.key
  const index = draft.exercises.findIndex((e) => e.key === key)
  const next = draft.exercises[index + 1]
  const label = supersetLabel(draft, key)
  const linkedToNext = Boolean(item.superset_group && item.superset_group === next?.superset_group)
  const sets = orderedSets(item)
  const lastWorking = lastSets.filter((row) => row.set_type !== 'warmup')
  const lastBest = bestE1rm(lastSets, exercise, bodyweight)

  /** Greyed-out values for an empty row: the left side just logged, else the user's earlier values. */
  function placeholderFor(set: DraftSet) {
    if (set.side === 'R') {
      const left = sets.find((s) => s.set_index === set.set_index && s.side === 'L')
      const weight = parseNumber(left?.weight ?? '')
      const reps = parseNumber(left?.reps ?? '')
      if (weight !== undefined || reps !== undefined) {
        return { weight: weight ?? null, reps: reps ?? null }
      }
    }
    // Started as "exercises only": the values of the workout it was copied from.
    if (set.hint) return set.hint
    const previous = lastSets.find((r) => r.set_index === set.set_index && r.side === set.side)
    return previous ? { weight: previous.weight, reps: previous.reps } : undefined
  }

  function complete(set: DraftSet) {
    primeAudio()
    const placeholder = placeholderFor(set)
    apply((current) => {
      // Confirming an untouched row accepts the greyed-out values shown in it.
      let result = updateSet(current, key, set.id, (s) => ({
        ...s,
        weight: s.weight || (placeholder?.weight != null ? String(placeholder.weight) : ''),
        reps: s.reps || (placeholder?.reps != null ? String(placeholder.reps) : ''),
        done: true,
      }))
      if (startsRest(result, key) && props.restSec > 0) {
        result = {
          ...result,
          rest: { endsAt: Date.now() + props.restSec * 1000, totalSec: props.restSec },
        }
      }
      return result
    })
  }

  return (
    <section className="rounded-xl border border-border bg-surface px-3 pb-3 pt-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-semibold leading-snug">
            {label && <span className="mr-1.5 text-accent">{label}</span>}
            {exercise.name}
          </h2>
          <span className="mt-1 inline-block rounded border border-border px-1.5 py-0.5 text-xs text-muted">
            {t(`equip.${exercise.equipment}`)}
          </span>
        </div>
        <button
          type="button"
          aria-expanded={more}
          aria-label={t('ex.more')}
          onClick={() => setMore((value) => !value)}
          className="-mr-1 -mt-1 size-11 shrink-0 text-xl text-muted"
        >
          ⋯
        </button>
      </div>

      {lastWorking.length > 0 && (
        <p className="mt-2 text-sm leading-snug text-muted">
          {t('ex.last')}: {lastWorking.map((row) => setText(row, lang, display, t)).join(' · ')}
        </p>
      )}
      {item.tempo && !more && <p className="mt-1 text-sm text-muted">Tempo {item.tempo}</p>}
      {item.note && !more && <p className="mt-1 text-sm text-muted">{item.note}</p>}

      {more && (
        <div className="mt-3 space-y-2">
          <input
            aria-label={t('ex.note')}
            placeholder={t('ex.note')}
            value={item.note}
            onChange={(e) => apply((d) => updateExercise(d, key, { note: e.target.value }))}
            className={field}
          />
          <input
            aria-label={t('ex.tempo')}
            placeholder={`${t('ex.tempo')} (${t('ex.tempoPlaceholder')})`}
            value={item.tempo}
            onChange={(e) => apply((d) => updateExercise(d, key, { tempo: e.target.value }))}
            className={field}
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" className={action} onClick={() => setSwapping(true)}>
              {t('ex.swap')}
            </button>
            {next && (
              <button
                type="button"
                className={action}
                onClick={() => apply((d) => toggleSupersetWithNext(d, key))}
              >
                {linkedToNext ? t('ex.unSuperset') : t('ex.superset')}
              </button>
            )}
            {index > 0 && (
              <button
                type="button"
                className={action}
                onClick={() => apply((d) => moveExercise(d, key, -1))}
              >
                ↑ {t('ex.moveUp')}
              </button>
            )}
            {next && (
              <button
                type="button"
                className={action}
                onClick={() => apply((d) => moveExercise(d, key, 1))}
              >
                ↓ {t('ex.moveDown')}
              </button>
            )}
            <Link to={`/workout/exercise/${exercise.id}`} className={`${action} flex items-center`}>
              {t('ex.history')}
            </Link>
            <button
              type="button"
              className={`${action} border-danger text-danger`}
              onClick={() => {
                if (window.confirm(t('ex.removeConfirm'))) apply((d) => removeExercise(d, key))
              }}
            >
              {t('ex.remove')}
            </button>
          </div>
        </div>
      )}

      <div className="mt-3">
        {sets.map((set) => (
          <SetRowEditor
            key={set.id}
            set={set}
            exercise={exercise}
            placeholder={placeholderFor(set)}
            lastBest={lastBest}
            bodyweight={bodyweight}
            display={display}
            planning={planning}
            onChange={(fn) => apply((d) => updateSet(d, key, set.id, fn))}
            onDone={() => complete(set)}
            onRemove={() => apply((d) => removeSet(d, key, set.id))}
            onGlossary={props.onGlossary}
          />
        ))}
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <button
          type="button"
          className={action}
          onClick={() => apply((d) => addSet(d, key, exercise.unilateral))}
        >
          {t('ex.addSet')}
        </button>
        {exercise.unilateral && (
          <>
            <button
              type="button"
              className={action}
              onClick={() => apply((d) => addSet(d, key, true, 'L'))}
            >
              {t('ex.addLeft')}
            </button>
            <button
              type="button"
              className={action}
              onClick={() => apply((d) => addSet(d, key, true, 'R'))}
            >
              {t('ex.addRight')}
            </button>
          </>
        )}
        <label className="ml-auto flex items-center gap-2 text-sm text-muted">
          {t('ex.setCount')}
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={countText ?? String(setCount(item))}
            onFocus={(e) => e.target.select()}
            onBlur={() => setCountText(null)}
            onChange={(e) => {
              const text = e.target.value.replace(/\D/g, '').slice(0, 2)
              setCountText(text)
              if (text !== '') {
                apply((d) => setSetCount(d, key, Number(text), exercise.unilateral))
              }
            }}
            className="min-h-11 w-14 rounded-lg border border-border bg-surface-2 text-center text-text focus:border-accent focus:outline-none"
          />
        </label>
      </div>

      {swapping && (
        <ExercisePicker
          title={t('ex.swapTitle')}
          suggested={findAlternatives(exercise)}
          suggestedEmpty={t('ex.swapEmpty')}
          optionLabel={props.onSwapInTemplate ? t('ex.swapSaveToTemplate') : undefined}
          onClose={() => setSwapping(false)}
          onPick={(picked, keepInTemplate) => {
            if (keepInTemplate) props.onSwapInTemplate?.(index, picked.id, picked.unilateral)
            apply((d) => swapExercise(d, key, picked.id, picked.unilateral))
            setSwapping(false)
          }}
        />
      )}
    </section>
  )
}
