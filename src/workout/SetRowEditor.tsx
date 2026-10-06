import { useState } from 'react'
import type { Exercise } from '../data/exercises'
import { useLang, useT } from '../i18n'
import { e1rm, rirToRpe, type SetType } from '../lib/calc'
import { formatNumber, parseNumber } from '../lib/number'
import { withFailure, withRir, withTechnique } from './draft'
import { intensityText, type IntensityDisplay } from './history'
import { SET_TYPES, TECHNIQUES, type DraftSet } from './types'

type Props = {
  set: DraftSet
  exercise: Exercise
  /** The user's own values from last time, shown greyed out in empty inputs. */
  placeholder?: { weight: number | null; reps: number | null }
  /** Best e1RM of this exercise in the previous session. */
  lastBest?: number
  bodyweight?: number
  display: IntensityDisplay
  /** The next set to do: its RIR and failure controls are open without a tap. */
  active?: boolean
  /** Editing a saved workout: rows hold stored values, there is nothing to complete. */
  planning?: boolean
  onChange: (fn: (set: DraftSet) => DraftSet) => void
  onDone: () => void
  onRemove: () => void
  onGlossary: () => void
}

const RIR_VALUES = [0, 1, 2, 3, 4, 5]

const input =
  'min-h-12 w-full min-w-0 rounded-lg border border-border bg-surface-2 px-2 text-center text-lg placeholder:text-muted/50 focus:border-accent focus:outline-none'

const chip = (active: boolean) =>
  'min-h-11 rounded-lg border px-2.5 text-sm leading-tight ' +
  (active ? 'border-accent bg-accent text-accent-fg' : 'border-border text-muted')

export function SetRowEditor(props: Props) {
  const { set, exercise, placeholder, lastBest, bodyweight, display, planning, onChange } = props
  const t = useT()
  const lang = useLang()
  const [open, setOpen] = useState(!set.done)
  const [showTechniques, setShowTechniques] = useState(false)
  // null = follow `active`; a tap on the set number or an input overrides it.
  const [details, setDetails] = useState<boolean | null>(null)
  // A completed set that was reopened is being edited, so it shows everything too.
  const showDetails = details ?? (Boolean(props.active) || set.done)

  const label = `${set.set_index + 1}${set.side ? ` ${t(`side.${set.side}`)}` : ''}`
  const weight = parseNumber(set.weight)
  const reps = parseNumber(set.reps)
  const estimate =
    set.set_type === 'warmup'
      ? undefined
      : e1rm(
          { weight, reps, rir: set.rir, failure: set.failure },
          { loadMode: exercise.loadMode, bodyweight },
        )

  if (set.done && !open) {
    const intensity = intensityText(set, display, t)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('set.edit')}
        className="flex min-h-11 w-full items-center gap-2 border-t border-border py-1.5 text-left"
      >
        <span className="w-10 shrink-0 text-sm text-muted">{label}</span>
        <span className="w-7 shrink-0 text-xs text-muted">
          {t(`settype.short.${set.set_type}`)}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">
          {set.weight || '–'} × {set.reps || '–'}
          {intensity && <span className="ml-2 font-normal text-muted">{intensity}</span>}
        </span>
        {estimate !== undefined && (
          <span className="shrink-0 text-xs text-muted">
            e1RM {formatNumber(estimate, lang, 1)}
            {lastBest !== undefined && estimate !== lastBest && (
              <span className={estimate > lastBest ? 'ml-1 text-accent' : 'ml-1 text-danger'}>
                {estimate > lastBest ? '▲' : '▼'}
              </span>
            )}
          </span>
        )}
        <span className="shrink-0 text-accent" aria-hidden="true">
          ✓
        </span>
      </button>
    )
  }

  return (
    <div className="space-y-2 border-t border-border py-2.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-expanded={showDetails}
          aria-label={`${label}: ${display === 'rpe' ? 'RPE' : 'RIR'}`}
          onClick={() => setDetails(!showDetails)}
          className="min-h-12 w-10 shrink-0 text-left text-sm text-muted"
        >
          {label}
          <span className="block text-[10px] leading-none">{showDetails ? '▴' : '▾'}</span>
        </button>

        {/* The native select sits invisibly on top of the short label: one tap, no dialog. */}
        <span className="relative flex size-12 shrink-0 items-center justify-center rounded-lg border border-border text-sm">
          {t(`settype.short.${set.set_type}`)}
          <select
            aria-label={t(`settype.${set.set_type}`)}
            value={set.set_type}
            onChange={(e) => onChange((s) => ({ ...s, set_type: e.target.value as SetType }))}
            className="absolute inset-0 size-full opacity-0"
          >
            {SET_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`settype.${type}`)}
              </option>
            ))}
          </select>
        </span>

        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-label={t('set.kg')}
          placeholder={
            placeholder?.weight != null ? formatNumber(placeholder.weight, lang, 2) : t('set.kg')
          }
          value={set.weight}
          onChange={(e) => onChange((s) => ({ ...s, weight: e.target.value }))}
          onFocus={() => setDetails(true)}
          className={input}
        />
        <span className="text-muted">×</span>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-label={t('set.reps')}
          placeholder={placeholder?.reps != null ? String(placeholder.reps) : t('set.reps')}
          value={set.reps}
          onChange={(e) => onChange((s) => ({ ...s, reps: e.target.value }))}
          onFocus={() => setDetails(true)}
          className={input}
        />
        {!planning && (
          <button
            type="button"
            aria-label={t('set.done')}
            aria-pressed={set.done}
            onClick={() => {
              if (!set.done) props.onDone()
              setOpen(false)
            }}
            className={
              'size-12 shrink-0 rounded-lg border text-xl ' +
              (set.done
                ? 'border-accent bg-accent text-accent-fg'
                : 'border-border bg-surface-2 text-muted')
            }
          >
            ✓
          </button>
        )}
      </div>

      {!showDetails && (set.rir !== null || set.failure !== 'none') && (
        <p className="pl-12 text-xs text-muted">{intensityText(set, display, t)}</p>
      )}
      {showDetails && (
        <>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={props.onGlossary}
              aria-label={t('set.glossary')}
              className="flex min-h-11 w-10 shrink-0 items-center gap-1 text-sm text-muted"
            >
              {display === 'rpe' ? 'RPE' : 'RIR'}
              <span className="flex size-4 items-center justify-center rounded-full border border-muted text-[10px]">
                i
              </span>
            </button>
            <div className="flex flex-1 overflow-hidden rounded-lg border border-border">
              {RIR_VALUES.map((rir) => (
                <button
                  key={rir}
                  type="button"
                  aria-pressed={set.rir === rir}
                  onClick={() => onChange((s) => withRir(s, rir))}
                  className={
                    'min-h-11 flex-1 border-l border-border text-sm first:border-l-0 ' +
                    (set.rir === rir ? 'bg-accent font-semibold text-accent-fg' : 'text-text')
                  }
                >
                  {display === 'rpe' ? (rir === 5 ? '≤5' : rirToRpe(rir)) : rir === 5 ? '5+' : rir}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-pressed={set.failure === 'near'}
              onClick={() => onChange((s) => withFailure(s, 'near'))}
              className={`${chip(set.failure === 'near')} flex-1`}
            >
              {t('set.near')}
            </button>
            <button
              type="button"
              aria-pressed={set.failure === 'failure'}
              onClick={() => onChange((s) => withFailure(s, 'failure'))}
              className={`${chip(set.failure === 'failure')} flex-1`}
            >
              {t('set.failure')}
            </button>
            <button
              type="button"
              aria-expanded={showTechniques}
              onClick={() => setShowTechniques((value) => !value)}
              className={chip(set.techniques.length > 0)}
            >
              {t('set.techniques')}
              {set.techniques.length > 0 && ` ${set.techniques.length}`}
            </button>
            <button
              type="button"
              aria-label={t('set.delete')}
              onClick={props.onRemove}
              className="min-h-11 w-10 shrink-0 text-lg text-muted"
            >
              ✕
            </button>
          </div>

          {showTechniques && (
            <div className="flex flex-wrap gap-2">
              {TECHNIQUES.map((technique) => (
                <button
                  key={technique}
                  type="button"
                  aria-pressed={set.techniques.includes(technique)}
                  onClick={() => onChange((s) => withTechnique(s, technique))}
                  className={chip(set.techniques.includes(technique))}
                >
                  {t(`tech.${technique}`)}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
