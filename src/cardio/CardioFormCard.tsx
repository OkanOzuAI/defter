import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  deleteCardioPreset,
  listCardioPresets,
  saveCardioPreset,
  saveCardioSession,
  type CardioPreset,
} from '../api/cardio'
import { isNetworkError } from '../api/errors'
import type { CardioSession } from '../api/types'
import { Button, Card, ErrorNote } from '../components/ui'
import { useLang, useT, type TKey } from '../i18n'
import { CARDIO_TYPES, type CardioType } from '../lib/calc'
import { isDateStr, type DateStr } from '../lib/date'
import { formatNumber } from '../lib/number'
import { cardioKey } from '../nutrition/hooks'
import {
  COMMON_FIELDS,
  emptyForm,
  toForm,
  toSession,
  TYPE_FIELDS,
  usesMetres,
  type CardioField,
  type CardioForm,
  type SpeedUnit,
} from './form'

type Props = {
  userId: string
  today: DateStr
  speedUnit: SpeedUnit
  /** Latest body weight, for the kcal estimate. */
  weightKg: number | undefined
  /** The session being edited, or nothing for a new entry. */
  editing?: CardioSession
  /** Most recent session, for "Sonuncuyu tekrarla". */
  last?: CardioSession
  onClose: () => void
}

const control =
  'min-h-12 w-full min-w-0 rounded-lg border bg-surface-2 px-3 focus:border-accent focus:outline-none'
const chip = 'min-h-11 shrink-0 rounded-full border border-border px-3.5 text-sm'

const presetsKey = (userId: string) => ['cardio-presets', userId] as const

export function CardioFormCard(props: Props) {
  const { userId, today, speedUnit, weightKg, editing, last } = props
  const t = useT()
  const lang = useLang()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<CardioForm>(() =>
    editing ? toForm(editing, speedUnit, lang) : emptyForm('walk', today),
  )
  const [badField, setBadField] = useState<CardioField | null>(null)

  const presets = useQuery({ queryKey: presetsKey(userId), queryFn: listCardioPresets })
  const refreshPresets = () => queryClient.invalidateQueries({ queryKey: presetsKey(userId) })
  const savePreset = useMutation({ mutationFn: saveCardioPreset, onSuccess: refreshPresets })
  const removePreset = useMutation({ mutationFn: deleteCardioPreset, onSuccess: refreshPresets })

  const save = useMutation({
    mutationFn: saveCardioSession,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cardioKey(userId) })
      props.onClose()
    },
  })

  const label = (field: CardioField): TKey => {
    if (field === 'distance' && usesMetres(form.type)) return 'cardio.f.distance_m'
    if (field === 'speed' && speedUnit === 'mph') return 'cardio.f.speed_mph'
    return `cardio.f.${field}`
  }

  const context = { id: editing?.id ?? 'preview', userId, speedUnit, weightKg }
  const preview = toSession(form, context)
  const estimate = !('error' in preview) && preview.kcal_estimated ? preview.kcal : null

  function submit() {
    const result = toSession(form, { ...context, id: editing?.id ?? crypto.randomUUID() })
    if ('error' in result) return setBadField(result.error)
    setBadField(null)
    save.mutate(result)
  }

  function applyPreset(preset: CardioPreset) {
    setForm({
      ...emptyForm(preset.type as CardioType, form.date),
      ...(preset.values as Partial<CardioForm>),
      type: preset.type as CardioType,
      date: form.date,
    })
  }

  function saveAsPreset() {
    const name = window.prompt(t('cardio.presetName'))?.trim()
    if (!name) return
    // The date is not part of a preset: it applies to whichever day is being logged.
    const values: Record<string, string> = { ...form }
    delete values.date
    delete values.type
    savePreset.mutate({
      id: crypto.randomUUID(),
      user_id: userId,
      name: name.slice(0, 80),
      type: form.type,
      values,
    })
  }

  const input = (field: CardioField) => (
    <label key={field} className="block min-w-0">
      <span className="mb-1 block truncate text-sm text-muted">{t(label(field))}</span>
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={form[field]}
        aria-invalid={badField === field}
        onChange={(e) => {
          setForm({ ...form, [field]: e.target.value })
          if (badField === field) setBadField(null)
        }}
        className={`${control} ${badField === field ? 'border-danger' : 'border-border'}`}
      />
    </label>
  )

  const error = save.error ?? savePreset.error ?? removePreset.error

  return (
    <Card>
      <h2 className="mb-3 font-medium">{t(editing ? 'cardio.editTitle' : 'cardio.add')}</h2>

      {!editing && (
        <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
          {last && (
            <button
              type="button"
              className={`${chip} text-accent`}
              onClick={() => setForm({ ...toForm(last, speedUnit, lang), date: form.date })}
            >
              {t('cardio.repeatLast')}
            </button>
          )}
          {presets.data?.map((preset) => (
            <span key={preset.id} className={`${chip} flex items-center gap-1 pr-1`}>
              <button type="button" className="min-h-11" onClick={() => applyPreset(preset)}>
                {preset.name}
              </button>
              <button
                type="button"
                aria-label={`${preset.name}: ${t('cardio.delete')}`}
                className="size-9 text-muted"
                onClick={() => {
                  if (window.confirm(t('cardio.deletePreset', { name: preset.name }))) {
                    removePreset.mutate(preset.id)
                  }
                }}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block min-w-0">
            <span className="mb-1 block text-sm text-muted">{t('cardio.type')}</span>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as CardioType })}
              className={`${control} border-border`}
            >
              {CARDIO_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`cardio.t.${type}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-0">
            <span className="mb-1 block text-sm text-muted">{t('cardio.date')}</span>
            <input
              type="date"
              value={form.date}
              max={today}
              onChange={(e) => {
                if (isDateStr(e.target.value)) setForm({ ...form, date: e.target.value })
              }}
              className={`${control} border-border`}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">{TYPE_FIELDS[form.type].map(input)}</div>
        <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
          {COMMON_FIELDS.map(input)}
        </div>
        {form.kcal.trim() === '' && (
          <p className="-mt-1 text-xs text-muted">
            {estimate !== null
              ? t('cardio.estimate', { kcal: formatNumber(estimate, lang, 0) })
              : weightKg === undefined
                ? t('cardio.estimateNeedsWeight')
                : ''}
          </p>
        )}

        <label className="block">
          <span className="mb-1 block text-sm text-muted">{t('cardio.f.note')}</span>
          <input
            type="text"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            className={`${control} border-border`}
          />
        </label>

        {badField && (
          <ErrorNote>{t('cardio.fieldInvalid', { field: t(label(badField)) })}</ErrorNote>
        )}
        {error && (
          <ErrorNote>
            {t(isNetworkError(error) ? 'app.serverUnreachable' : 'common.error')}
          </ErrorNote>
        )}

        <div className="flex gap-2">
          <Button className="flex-1" disabled={save.isPending} onClick={submit}>
            {save.isPending ? t('common.saving') : t('common.save')}
          </Button>
          <Button variant="ghost" onClick={props.onClose}>
            {t('common.cancel')}
          </Button>
        </div>
        <Button variant="secondary" block disabled={savePreset.isPending} onClick={saveAsPreset}>
          {t('cardio.savePreset')}
        </Button>
      </div>
    </Card>
  )
}
