import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteDietPhase, saveDietPhase } from '../api/dietPhases'
import { isNetworkError } from '../api/errors'
import type { DietPhase, DietPhaseType } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import {
  Button,
  Card,
  ErrorNote,
  Field,
  Message,
  NumberInput,
  Select,
  TextInput,
} from '../components/ui'
import { useLang, useT, type TKey } from '../i18n'
import { reverseDietTarget } from '../lib/calc'
import { diffDays, formatDate, isDateStr, today as todayDate } from '../lib/date'
import { activePhase, dayTargets } from '../lib/diet'
import { formatNumber, parseNumber, toInputValue } from '../lib/number'
import { phasesKey, useDietPhases } from '../nutrition/hooks'

const TYPES: DietPhaseType[] = ['cut', 'maintenance', 'reverse', 'bulk']

export function DietPhasesPage() {
  const t = useT()
  const lang = useLang()
  const { user } = useAuth()
  const userId = user!.id
  const queryClient = useQueryClient()
  const today = todayDate()
  const phases = useDietPhases(userId)
  const [editing, setEditing] = useState<string | null>(null)

  const refresh = () => queryClient.invalidateQueries({ queryKey: phasesKey(userId) })
  const save = useMutation({
    mutationFn: saveDietPhase,
    onSuccess: () => {
      setEditing(null)
      return refresh()
    },
  })
  const remove = useMutation({
    mutationFn: deleteDietPhase,
    onSuccess: () => {
      setEditing(null)
      return refresh()
    },
  })

  if (phases.isPending) return <p className="py-6 text-sm text-muted">{t('app.loading')}</p>
  if (phases.isError) {
    return (
      <Message
        title={t(isNetworkError(phases.error) ? 'app.serverUnreachable' : 'common.error')}
        body={t('app.serverUnreachableHint')}
        action={<Button onClick={() => phases.refetch()}>{t('app.retry')}</Button>}
      />
    )
  }

  const active = activePhase(phases.data, today)
  const error = save.error ?? remove.error
  const number = (value: number | null) => (value === null ? '–' : formatNumber(value, lang, 0))
  const date = (value: string) =>
    formatDate(value, lang, { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="space-y-4">
      <div>
        <Link to="/profile" className="flex min-h-11 items-center text-sm text-accent">
          ‹ {t('nav.profile')}
        </Link>
        <h1 className="text-xl font-semibold">{t('phases.title')}</h1>
      </div>

      {error && (
        <ErrorNote>{t(isNetworkError(error) ? 'app.serverUnreachable' : 'common.error')}</ErrorNote>
      )}

      {editing === 'new' ? (
        <Card>
          <PhaseForm
            userId={userId}
            today={today}
            saving={save.isPending}
            onSave={(phase) => save.mutate(phase)}
            onCancel={() => setEditing(null)}
          />
        </Card>
      ) : (
        <Button block onClick={() => setEditing('new')}>
          + {t('phases.add')}
        </Button>
      )}

      {phases.data.length === 0 && editing !== 'new' && <Message title={t('phases.empty')} />}

      {phases.data.map((phase) =>
        editing === phase.id ? (
          <Card key={phase.id}>
            <PhaseForm
              userId={userId}
              today={today}
              initial={phase}
              saving={save.isPending}
              onSave={(next) => save.mutate(next)}
              onCancel={() => setEditing(null)}
              onDelete={() => {
                if (window.confirm(t('phases.deleteConfirm'))) remove.mutate(phase.id)
              }}
            />
          </Card>
        ) : (
          <Card key={phase.id}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-semibold">
                {t(`phase.${phase.type}`)}
                {phase.id === active?.id && (
                  <span className="ml-2 text-xs font-normal text-accent">{t('phases.active')}</span>
                )}
              </h2>
              <button
                type="button"
                className="-my-2 min-h-11 shrink-0 text-sm text-accent"
                onClick={() => setEditing(phase.id)}
              >
                {t('tpl.edit')}
              </button>
            </div>
            <p className="text-sm text-muted">
              {date(phase.start_date)} –{' '}
              {phase.end_date ? date(phase.end_date) : t('phases.ongoing')}
            </p>
            <dl className="mt-2 space-y-0.5 text-sm">
              {(['training', 'rest'] as const).map((day) => {
                const targets = dayTargets(
                  phase,
                  phase.id === active?.id ? today : phase.start_date,
                  day === 'training',
                )
                return (
                  <div key={day} className="flex justify-between gap-3">
                    <dt className="text-muted">{t(`phases.${day}`)}</dt>
                    <dd className="text-right">
                      {number(targets.kcal)} kcal · {number(targets.protein)} /{' '}
                      {number(targets.carbs)} / {number(targets.fat)} g
                    </dd>
                  </div>
                )
              })}
            </dl>
            {phase.type === 'reverse' && phase.weekly_kcal_step ? (
              <p className="mt-1 text-xs text-muted">
                +{number(phase.weekly_kcal_step)} kcal / {lang === 'tr' ? 'hafta' : 'week'}
              </p>
            ) : null}
          </Card>
        ),
      )}
    </div>
  )
}

const NUMBER_KEYS = [
  'kcal_training',
  'kcal_rest',
  'protein',
  'carbs',
  'fat',
  'protein_rest',
  'carbs_rest',
  'fat_rest',
  'weekly_kcal_step',
  'target_weekly_change_pct',
] as const
type NumberKey = (typeof NUMBER_KEYS)[number]

function PhaseForm({
  userId,
  today,
  initial,
  saving,
  onSave,
  onCancel,
  onDelete,
}: {
  userId: string
  today: string
  initial?: DietPhase
  saving: boolean
  onSave: (phase: DietPhase) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const t = useT()
  const lang = useLang()
  const [type, setType] = useState<DietPhaseType>(initial?.type ?? 'cut')
  const [start, setStart] = useState(initial?.start_date ?? today)
  const [end, setEnd] = useState(initial?.end_date ?? '')
  const [numbers, setNumbers] = useState<Record<NumberKey, string>>(
    () =>
      Object.fromEntries(
        NUMBER_KEYS.map((key) => [key, toInputValue(initial?.[key], lang, 2)]),
      ) as Record<NumberKey, string>,
  )
  const [formError, setFormError] = useState<TKey | null>(null)
  const reverse = type === 'reverse'

  function submit() {
    if (!isDateStr(start) || (end !== '' && (!isDateStr(end) || end < start))) {
      return setFormError('phases.dateInvalid')
    }
    const values = {} as Record<NumberKey, number | null>
    for (const key of NUMBER_KEYS) {
      const text = numbers[key].trim()
      const value = text === '' ? null : parseNumber(text)
      const negativeAllowed = key === 'target_weekly_change_pct'
      if (value === undefined || (value !== null && value < 0 && !negativeAllowed)) {
        return setFormError('phases.numberInvalid')
      }
      values[key] = value
    }
    setFormError(null)
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      user_id: userId,
      type,
      start_date: start,
      end_date: end || null,
      ...values,
      // The weekly step only means something in a reverse diet.
      weekly_kcal_step: reverse ? values.weekly_kcal_step : null,
    })
  }

  const input = (key: NumberKey, label: string, decimal = true) => (
    <label className="block min-w-0">
      <span className="mb-1 block truncate text-xs text-muted">{label}</span>
      <NumberInput
        inputMode={decimal ? 'decimal' : 'numeric'}
        value={numbers[key]}
        onChange={(e) => setNumbers({ ...numbers, [key]: e.target.value })}
      />
    </label>
  )

  const startKcal = parseNumber(numbers.kcal_training)
  const step = parseNumber(numbers.weekly_kcal_step)
  const preview =
    reverse && startKcal !== undefined && step !== undefined && isDateStr(start)
      ? reverseDietTarget(startKcal, step, diffDays(start, today))
      : null

  return (
    <div className="space-y-3">
      <h2 className="font-medium">{t(initial ? 'phases.edit' : 'phases.add')}</h2>
      <Field label={t('phases.type')}>
        <Select value={type} onChange={(e) => setType(e.target.value as DietPhaseType)}>
          {TYPES.map((value) => (
            <option key={value} value={value}>
              {t(`phase.${value}`)}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('phases.start')}>
          <TextInput type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label={t('phases.end')} optional={t('common.optional')}>
          <TextInput type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </Field>
      </div>

      <p className="pt-1 text-sm text-muted">{t('phases.training')}</p>
      <div className="grid grid-cols-4 gap-2">
        {input('kcal_training', reverse ? t('phases.startKcal') : t('phases.kcal'), false)}
        {input('protein', t('nut.f.protein'))}
        {input('carbs', t('nut.f.carbs'))}
        {input('fat', t('nut.f.fat'))}
      </div>

      <p className="pt-1 text-sm text-muted">{t('phases.rest')}</p>
      <div className="grid grid-cols-4 gap-2">
        {input('kcal_rest', reverse ? t('phases.startKcal') : t('phases.kcal'), false)}
        {input('protein_rest', t('nut.f.protein'))}
        {input('carbs_rest', t('nut.f.carbs'))}
        {input('fat_rest', t('nut.f.fat'))}
      </div>
      <p className="text-xs text-muted">{t('phases.restHint')}</p>

      {reverse && (
        <div>
          {input('weekly_kcal_step', t('phases.weeklyStep'), false)}
          <p className="mt-1 text-xs text-muted">
            {t('phases.weeklyStepHint')}
            {preview != null &&
              ` ${t('phases.currentTarget', { kcal: formatNumber(preview, lang, 0) })}`}
          </p>
        </div>
      )}

      <div>
        {input('target_weekly_change_pct', t('phases.weeklyChange'))}
        <p className="mt-1 text-xs text-muted">{t('phases.weeklyChangeHint')}</p>
      </div>

      {formError && <ErrorNote>{t(formError)}</ErrorNote>}
      <div className="flex gap-2">
        <Button className="flex-1" disabled={saving} onClick={submit}>
          {saving ? t('common.saving') : t('common.save')}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
      {onDelete && (
        <Button variant="danger" block onClick={onDelete}>
          {t('phases.delete')}
        </Button>
      )}
    </div>
  )
}
