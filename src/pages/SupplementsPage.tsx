import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { isNetworkError } from '../api/errors'
import { deleteSupplement, saveSupplements } from '../api/supplements'
import {
  SUPPLEMENT_TIMINGS,
  SUPPLEMENT_UNITS,
  type Supplement,
  type SupplementTiming,
  type SupplementUnit,
} from '../api/types'
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
import { useLang, useT } from '../i18n'
import { addDays, today as todayDate } from '../lib/date'
import { adherence } from '../lib/diet'
import { formatNumber, parseNumber, toInputValue } from '../lib/number'
import { supplementsKey, useSupplementLogs, useSupplements } from '../nutrition/hooks'

type FormState = {
  name: string
  dose: string
  unit: SupplementUnit
  timing: SupplementTiming
  dailyMax: string
  caffeine: string
  kcal: string
  protein: string
  carbs: string
  fat: string
  countMacros: boolean
}

export function SupplementsPage() {
  const t = useT()
  const lang = useLang()
  const { user } = useAuth()
  const userId = user!.id
  const queryClient = useQueryClient()
  const today = todayDate()
  const supplements = useSupplements(userId)
  const logs = useSupplementLogs(userId, addDays(today, -29), today)
  // Which supplement's form is open; 'new' for a blank one.
  const [editing, setEditing] = useState<string | null>(null)

  const refresh = () => queryClient.invalidateQueries({ queryKey: supplementsKey(userId) })
  const save = useMutation({ mutationFn: saveSupplements, onSuccess: refresh })
  const remove = useMutation({ mutationFn: deleteSupplement, onSuccess: refresh })

  if (supplements.isPending) return <p className="py-6 text-sm text-muted">{t('app.loading')}</p>
  if (supplements.isError) {
    return (
      <Message
        title={t(isNetworkError(supplements.error) ? 'app.serverUnreachable' : 'common.error')}
        body={t('app.serverUnreachableHint')}
        action={<Button onClick={() => supplements.refetch()}>{t('app.retry')}</Button>}
      />
    )
  }

  const all = supplements.data
  const sections = [
    { title: t('sup.activeSection'), items: all.filter((s) => s.active) },
    { title: t('sup.inactiveSection'), items: all.filter((s) => !s.active) },
  ]

  /** Swaps a supplement with its neighbour in the same section. */
  function move(list: Supplement[], index: number, direction: -1 | 1) {
    const a = list[index]
    const b = list[index + direction]
    if (!a || !b) return
    save.mutate([
      { ...a, position: b.position },
      // Seeded positions are unique, but guard against two rows sharing one.
      { ...b, position: a.position === b.position ? a.position - direction : a.position },
    ])
  }

  const small = 'min-h-11 rounded-lg border border-border px-3 text-sm'
  const error = save.error ?? remove.error

  return (
    <div className="space-y-4">
      <div>
        <Link to="/profile" className="flex min-h-11 items-center text-sm text-accent">
          ‹ {t('nav.profile')}
        </Link>
        <h1 className="text-xl font-semibold">{t('sup.title')}</h1>
        <p className="mt-1 text-xs text-muted">{t('sup.disclaimer')}</p>
      </div>

      {error && (
        <ErrorNote>{t(isNetworkError(error) ? 'app.serverUnreachable' : 'common.error')}</ErrorNote>
      )}

      {editing === 'new' ? (
        <Card>
          <SupplementForm
            saving={save.isPending}
            onCancel={() => setEditing(null)}
            onSave={(values) =>
              save.mutate(
                [
                  {
                    id: crypto.randomUUID(),
                    user_id: userId,
                    active: true,
                    position: Math.max(-1, ...all.map((s) => s.position)) + 1,
                    ...values,
                  },
                ],
                { onSuccess: () => setEditing(null) },
              )
            }
          />
        </Card>
      ) : (
        <Button variant="secondary" block onClick={() => setEditing('new')}>
          + {t('sup.add')}
        </Button>
      )}

      {sections.map(
        (section) =>
          section.items.length > 0 && (
            <section key={section.title}>
              <h2 className="mb-1 text-sm text-muted">{section.title}</h2>
              <ul>
                {section.items.map((supplement, index) => {
                  const taken = (logs.data ?? [])
                    .filter((log) => log.supplement_id === supplement.id)
                    .map((log) => log.date)
                  const stats = adherence(taken, today)
                  return (
                    <li key={supplement.id} className="border-t border-border py-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{supplement.name}</p>
                          <p className="text-sm text-muted">
                            {supplement.dose !== null && formatNumber(supplement.dose, lang, 2)}{' '}
                            {t(`sup.unit.${supplement.unit}`)} ·{' '}
                            {t(`sup.timing.${supplement.timing}`)}
                          </p>
                          {supplement.active && (
                            <p className="text-xs text-muted">
                              {t('sup.adherence', {
                                p7: Math.round(stats.pct7),
                                p30: Math.round(stats.pct30),
                                streak: stats.streak,
                              })}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={supplement.active}
                          aria-label={`${supplement.name}: ${t('sup.active')}`}
                          onClick={() =>
                            save.mutate([{ ...supplement, active: !supplement.active }])
                          }
                          className={
                            'flex h-11 w-14 shrink-0 items-center rounded-full border px-1 ' +
                            (supplement.active
                              ? 'justify-end border-accent bg-accent'
                              : 'justify-start border-border bg-surface-2')
                          }
                        >
                          <span
                            className={
                              'size-8 rounded-full ' +
                              (supplement.active ? 'bg-accent-fg' : 'bg-muted')
                            }
                          />
                        </button>
                      </div>

                      {editing === supplement.id ? (
                        <div className="mt-3">
                          <SupplementForm
                            initial={supplement}
                            saving={save.isPending}
                            onCancel={() => setEditing(null)}
                            onSave={(values) =>
                              save.mutate([{ ...supplement, ...values }], {
                                onSuccess: () => setEditing(null),
                              })
                            }
                            onDelete={() => {
                              if (
                                window.confirm(t('sup.deleteConfirm', { name: supplement.name }))
                              ) {
                                remove.mutate(supplement.id)
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            className={small}
                            onClick={() => setEditing(supplement.id)}
                          >
                            {t('sup.edit')}
                          </button>
                          <button
                            type="button"
                            className={small}
                            aria-label={t('ex.moveUp')}
                            disabled={index === 0}
                            onClick={() => move(section.items, index, -1)}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className={small}
                            aria-label={t('ex.moveDown')}
                            disabled={index === section.items.length - 1}
                            onClick={() => move(section.items, index, 1)}
                          >
                            ↓
                          </button>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          ),
      )}
    </div>
  )
}

type Values = Pick<
  Supplement,
  'name' | 'dose' | 'unit' | 'timing' | 'daily_max' | 'caffeine_mg' | 'macros' | 'count_macros'
>

function SupplementForm({
  initial,
  saving,
  onSave,
  onCancel,
  onDelete,
}: {
  initial?: Supplement
  saving: boolean
  onSave: (values: Values) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const t = useT()
  const lang = useLang()
  const text = (value: number | null | undefined) => toInputValue(value, lang, 2)
  const [form, setForm] = useState<FormState>({
    name: initial?.name ?? '',
    dose: text(initial?.dose),
    unit: initial?.unit ?? 'g',
    timing: initial?.timing ?? 'any',
    dailyMax: text(initial?.daily_max),
    caffeine: text(initial?.caffeine_mg),
    kcal: text(initial?.macros?.kcal),
    protein: text(initial?.macros?.protein),
    carbs: text(initial?.macros?.carbs),
    fat: text(initial?.macros?.fat),
    countMacros: initial?.count_macros ?? false,
  })
  const [nameMissing, setNameMissing] = useState(false)
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }))
  const number = (value: string) => parseNumber(value) ?? null

  function submit() {
    if (!form.name.trim()) return setNameMissing(true)
    const macros = {
      kcal: parseNumber(form.kcal),
      protein: parseNumber(form.protein),
      carbs: parseNumber(form.carbs),
      fat: parseNumber(form.fat),
    }
    const hasMacros = Object.values(macros).some((value) => value !== undefined)
    onSave({
      name: form.name.trim(),
      dose: number(form.dose),
      unit: form.unit,
      timing: form.timing,
      daily_max: number(form.dailyMax),
      caffeine_mg: number(form.caffeine),
      macros: hasMacros ? macros : null,
      count_macros: hasMacros && form.countMacros,
    })
  }

  const optional = t('common.optional')
  const macro = (key: 'kcal' | 'protein' | 'carbs' | 'fat', label: string) => (
    <label className="block min-w-0">
      <span className="mb-1 block truncate text-xs text-muted">{label}</span>
      <NumberInput value={form[key]} onChange={(e) => set(key, e.target.value)} />
    </label>
  )

  return (
    <div className="space-y-3">
      <Field label={t('sup.name')} error={nameMissing ? t('sup.nameRequired') : undefined}>
        <TextInput
          value={form.name}
          maxLength={80}
          onChange={(e) => {
            set('name', e.target.value)
            setNameMissing(false)
          }}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('sup.defaultDose')}>
          <NumberInput value={form.dose} onChange={(e) => set('dose', e.target.value)} />
        </Field>
        <Field label={t('sup.unitLabel')}>
          <Select value={form.unit} onChange={(e) => set('unit', e.target.value as SupplementUnit)}>
            {SUPPLEMENT_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {t(`sup.unit.${unit}`)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={t('sup.timingLabel')}>
        <Select
          value={form.timing}
          onChange={(e) => set('timing', e.target.value as SupplementTiming)}
        >
          {SUPPLEMENT_TIMINGS.map((timing) => (
            <option key={timing} value={timing}>
              {t(`sup.timing.${timing}`)}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('sup.dailyMax')} optional={optional}>
          <NumberInput value={form.dailyMax} onChange={(e) => set('dailyMax', e.target.value)} />
        </Field>
        <Field label={t('sup.caffeineMg')} optional={optional}>
          <NumberInput value={form.caffeine} onChange={(e) => set('caffeine', e.target.value)} />
        </Field>
      </div>
      <div>
        <p className="mb-1.5 text-sm text-muted">
          {t('sup.macros')} · {optional}
        </p>
        <div className="grid grid-cols-4 gap-2">
          {macro('kcal', t('unit.kcal'))}
          {macro('protein', t('nut.f.protein'))}
          {macro('carbs', t('nut.f.carbs'))}
          {macro('fat', t('nut.f.fat'))}
        </div>
        <label className="mt-1 flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={form.countMacros}
            onChange={(e) => set('countMacros', e.target.checked)}
            className="size-5 accent-(--accent)"
          />
          {t('sup.countMacros')}
        </label>
      </div>
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
          {t('sup.delete')}
        </Button>
      )}
    </div>
  )
}
