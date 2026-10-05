import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { isNetworkError } from '../api/errors'
import {
  deleteCustomExercise,
  getExerciseData,
  saveCustomExercise,
  saveExerciseSetting,
  type CustomExerciseRow,
} from '../api/exercises'
import { useAuth } from '../auth/AuthContext'
import { Button, Card, ErrorNote, Field, NumberInput, Select, TextInput } from '../components/ui'
import {
  CATEGORIES,
  EQUIPMENT,
  MUSCLES,
  PATTERN_IDS,
  type Category,
  type Equipment,
  type Exercise,
  type LoadMode,
  type Muscle,
} from '../data/exercises'
import { useLang, useT } from '../i18n'
import { parseNumber, toInputValue } from '../lib/number'
import { exerciseDataKey, useExercises } from '../workout/exercises'

const LOAD_MODES: LoadMode[] = ['total', 'per_hand', 'added_bodyweight']
const check = 'size-5 accent-(--accent)'

export function ExerciseLibraryPage() {
  const t = useT()
  const { user } = useAuth()
  const userId = user!.id
  const queryClient = useQueryClient()
  const { all } = useExercises()
  // The raw custom rows, to prefill the edit form.
  const raw = useQuery({ queryKey: [...exerciseDataKey(userId), 'raw'], queryFn: getExerciseData })
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | ''>('')
  const [muscle, setMuscle] = useState<Muscle | ''>('')
  const [equipment, setEquipment] = useState<Equipment | ''>('')
  const [showHidden, setShowHidden] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const refresh = () => queryClient.invalidateQueries({ queryKey: exerciseDataKey(userId) })
  const saveSetting = useMutation({ mutationFn: saveExerciseSetting, onSuccess: refresh })
  const saveCustom = useMutation({ mutationFn: saveCustomExercise, onSuccess: refresh })
  const removeCustom = useMutation({ mutationFn: deleteCustomExercise, onSuccess: refresh })

  const results = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    return all.filter(
      (exercise) =>
        (showHidden || !exercise.hidden) &&
        (!category || exercise.category === category) &&
        (!equipment || exercise.equipment === equipment) &&
        (!muscle ||
          exercise.primaryMuscles.includes(muscle) ||
          exercise.secondaryMuscles.includes(muscle)) &&
        words.every((word) => exercise.name.toLowerCase().includes(word)),
    )
  }, [all, query, category, muscle, equipment, showHidden])

  const error = saveSetting.error ?? saveCustom.error ?? removeCustom.error

  return (
    <div className="space-y-4">
      <div>
        <Link to="/profile" className="flex min-h-11 items-center text-sm text-accent">
          ‹ {t('nav.profile')}
        </Link>
        <h1 className="text-xl font-semibold">{t('lib.title')}</h1>
      </div>

      {error && (
        <ErrorNote>{t(isNetworkError(error) ? 'app.serverUnreachable' : 'common.error')}</ErrorNote>
      )}

      {adding ? (
        <Card>
          <CustomForm
            userId={userId}
            saving={saveCustom.isPending}
            onCancel={() => setAdding(false)}
            onSave={(row) => saveCustom.mutate(row, { onSuccess: () => setAdding(false) })}
          />
        </Card>
      ) : (
        <Button variant="secondary" block onClick={() => setAdding(true)}>
          + {t('lib.addCustom')}
        </Button>
      )}

      <div className="space-y-2">
        <TextInput
          type="search"
          placeholder={t('ex.search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="grid grid-cols-3 gap-2">
          <Select
            aria-label={t('lib.category')}
            value={category}
            onChange={(e) => setCategory(e.target.value as Category | '')}
          >
            <option value="">{t('lib.category')}</option>
            {CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {t(`cat.${value}`)}
              </option>
            ))}
          </Select>
          <Select
            aria-label={t('lib.muscle')}
            value={muscle}
            onChange={(e) => setMuscle(e.target.value as Muscle | '')}
          >
            <option value="">{t('lib.muscle')}</option>
            {MUSCLES.map((value) => (
              <option key={value} value={value}>
                {t(`muscle.${value}`)}
              </option>
            ))}
          </Select>
          <Select
            aria-label={t('lib.equipment')}
            value={equipment}
            onChange={(e) => setEquipment(e.target.value as Equipment | '')}
          >
            <option value="">{t('lib.equipment')}</option>
            {EQUIPMENT.map((value) => (
              <option key={value} value={value}>
                {t(`equip.${value}`)}
              </option>
            ))}
          </Select>
        </div>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            className={check}
            checked={showHidden}
            onChange={(e) => setShowHidden(e.target.checked)}
          />
          {t('lib.showHidden')}
          <span className="ml-auto text-muted">{t('lib.count', { n: results.length })}</span>
        </label>
      </div>

      {results.length === 0 ? (
        <p className="py-6 text-sm text-muted">{t('ex.noResults')}</p>
      ) : (
        <ul>
          {results.map((exercise) => (
            <li key={exercise.id} className="border-t border-border">
              <button
                type="button"
                aria-expanded={open === exercise.id}
                onClick={() => setOpen(open === exercise.id ? null : exercise.id)}
                className="flex min-h-12 w-full items-center justify-between gap-3 py-2 text-left"
              >
                <span className={exercise.hidden ? 'text-muted line-through' : ''}>
                  {exercise.name}
                </span>
                <span className="shrink-0 text-xs text-muted">
                  {exercise.custom ? `${t('lib.custom')} · ` : ''}
                  {t(`equip.${exercise.equipment}`)}
                </span>
              </button>
              {open === exercise.id && (
                <div className="pb-4">
                  <p className="mb-3 text-sm text-muted">
                    {exercise.primaryMuscles.map((m) => t(`muscle.${m}`)).join(', ')}
                    {exercise.secondaryMuscles.length > 0 &&
                      ` · ${exercise.secondaryMuscles.map((m) => t(`muscle.${m}`)).join(', ')}`}
                  </p>
                  <SettingsForm
                    key={`${exercise.id}-${exercise.hidden}-${exercise.increment}-${exercise.barWeight}-${exercise.restOverride}`}
                    exercise={exercise}
                    saving={saveSetting.isPending}
                    onSave={(setting) => saveSetting.mutate(setting)}
                  />
                  {exercise.custom && (
                    <div className="mt-3 border-t border-border pt-3">
                      <CustomForm
                        userId={userId}
                        initial={raw.data?.custom.find((row) => row.id === exercise.id)}
                        saving={saveCustom.isPending}
                        onCancel={() => setOpen(null)}
                        onSave={(row) => saveCustom.mutate(row)}
                        onDelete={() => {
                          if (window.confirm(t('lib.deleteConfirm', { name: exercise.name }))) {
                            removeCustom.mutate(exercise.id)
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Per-user overrides for one exercise: hide it, change its increment, bar weight or rest. */
function SettingsForm({
  exercise,
  saving,
  onSave,
}: {
  exercise: Exercise
  saving: boolean
  onSave: (setting: Parameters<typeof saveExerciseSetting>[0]) => void
}) {
  const t = useT()
  const lang = useLang()
  const [hidden, setHidden] = useState(exercise.hidden ?? false)
  const [increment, setIncrement] = useState(toInputValue(exercise.increment, lang, 2))
  const [barWeight, setBarWeight] = useState(toInputValue(exercise.barWeight, lang, 2))
  const [rest, setRest] = useState(toInputValue(exercise.restOverride ?? exercise.restSec, lang, 0))
  const [bad, setBad] = useState(false)

  function submit() {
    const inc = parseNumber(increment)
    const bar = barWeight.trim() === '' ? null : parseNumber(barWeight)
    const seconds = parseNumber(rest)
    if (inc === undefined || inc <= 0 || bar === undefined || seconds === undefined) {
      return setBad(true)
    }
    setBad(false)
    onSave({
      exercise_id: exercise.id,
      hidden,
      increment: inc,
      bar_weight: bar,
      rest_sec: Math.round(seconds),
      note: exercise.note ?? null,
    })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Field label={t('lib.increment')}>
          <NumberInput value={increment} onChange={(e) => setIncrement(e.target.value)} />
        </Field>
        <Field label={t('lib.barWeight')}>
          <NumberInput value={barWeight} onChange={(e) => setBarWeight(e.target.value)} />
        </Field>
        <Field label={t('lib.rest')}>
          <NumberInput inputMode="numeric" value={rest} onChange={(e) => setRest(e.target.value)} />
        </Field>
      </div>
      {exercise.equipment === 'smith' && <p className="text-xs text-muted">{t('lib.smithNote')}</p>}
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          className={check}
          checked={hidden}
          onChange={(e) => setHidden(e.target.checked)}
        />
        {t('lib.hide')}
      </label>
      {bad && <p className="text-sm text-danger">{t('nut.invalid')}</p>}
      <Button variant="secondary" block disabled={saving} onClick={submit}>
        {saving ? t('common.saving') : t('common.save')}
      </Button>
    </div>
  )
}

function CustomForm({
  userId,
  initial,
  saving,
  onSave,
  onCancel,
  onDelete,
}: {
  userId: string
  initial?: CustomExerciseRow
  saving: boolean
  onSave: (row: CustomExerciseRow) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const t = useT()
  const lang = useLang()
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState(initial?.category ?? 'chest')
  const [equipment, setEquipment] = useState(initial?.equipment ?? 'machine')
  const [pattern, setPattern] = useState(initial?.pattern ?? '')
  const [primary, setPrimary] = useState<string[]>(initial?.primary_muscles ?? [])
  const [secondary, setSecondary] = useState<string[]>(initial?.secondary_muscles ?? [])
  const [compound, setCompound] = useState(initial?.is_compound ?? false)
  const [unilateral, setUnilateral] = useState(initial?.unilateral ?? false)
  const [loadMode, setLoadMode] = useState<LoadMode>(initial?.load_mode ?? 'total')
  const [increment, setIncrement] = useState(toInputValue(initial?.increment ?? 2.5, lang, 2))
  const [barWeight, setBarWeight] = useState(toInputValue(initial?.bar_weight, lang, 2))
  const [bad, setBad] = useState(false)

  function submit() {
    const inc = parseNumber(increment)
    const bar = barWeight.trim() === '' ? null : parseNumber(barWeight)
    if (
      !name.trim() ||
      primary.length === 0 ||
      inc === undefined ||
      inc <= 0 ||
      bar === undefined
    ) {
      return setBad(true)
    }
    setBad(false)
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      user_id: userId,
      name: name.trim(),
      category,
      equipment,
      pattern: pattern || null,
      primary_muscles: primary,
      // A muscle is either primary or secondary, not both.
      secondary_muscles: secondary.filter((m) => !primary.includes(m)),
      is_compound: compound,
      unilateral,
      load_mode: loadMode,
      increment: inc,
      bar_weight: bar,
    })
  }

  const muscles = (selected: string[], set: (next: string[]) => void) => (
    <div className="flex flex-wrap gap-2">
      {MUSCLES.map((m) => {
        const active = selected.includes(m)
        return (
          <button
            key={m}
            type="button"
            aria-pressed={active}
            onClick={() => set(active ? selected.filter((x) => x !== m) : [...selected, m])}
            className={
              'min-h-11 rounded-full border px-3 text-sm ' +
              (active ? 'border-accent bg-accent text-accent-fg' : 'border-border text-muted')
            }
          >
            {t(`muscle.${m}`)}
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="space-y-3">
      <h2 className="font-medium">{t(initial ? 'lib.editCustom' : 'lib.addCustom')}</h2>
      <Field label={t('lib.name')}>
        <TextInput value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('lib.category')}>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {t(`cat.${value}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('lib.equipment')}>
          <Select value={equipment} onChange={(e) => setEquipment(e.target.value)}>
            {EQUIPMENT.map((value) => (
              <option key={value} value={value}>
                {t(`equip.${value}`)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={t('lib.pattern')} optional={t('common.optional')}>
        <Select value={pattern} onChange={(e) => setPattern(e.target.value)}>
          <option value="">{t('lib.patternNone')}</option>
          {PATTERN_IDS.map((value) => (
            <option key={value} value={value}>
              {value.replace(/_/g, ' ')}
            </option>
          ))}
        </Select>
      </Field>
      <div>
        <p className="mb-1.5 text-sm text-muted">{t('lib.primary')}</p>
        {muscles(primary, setPrimary)}
      </div>
      <div>
        <p className="mb-1.5 text-sm text-muted">{t('lib.secondary')}</p>
        {muscles(secondary, setSecondary)}
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          className={check}
          checked={compound}
          onChange={(e) => setCompound(e.target.checked)}
        />
        {t('lib.compound')}
      </label>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          className={check}
          checked={unilateral}
          onChange={(e) => setUnilateral(e.target.checked)}
        />
        {t('lib.unilateral')}
      </label>
      <Field label={t('lib.loadMode')}>
        <Select value={loadMode} onChange={(e) => setLoadMode(e.target.value as LoadMode)}>
          {LOAD_MODES.map((value) => (
            <option key={value} value={value}>
              {t(`lib.load.${value}`)}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('lib.increment')}>
          <NumberInput value={increment} onChange={(e) => setIncrement(e.target.value)} />
        </Field>
        <Field label={t('lib.barWeight')} optional={t('common.optional')}>
          <NumberInput value={barWeight} onChange={(e) => setBarWeight(e.target.value)} />
        </Field>
      </div>
      {bad && <ErrorNote>{t('lib.nameRequired')}</ErrorNote>}
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
          {t('lib.delete')}
        </Button>
      )}
    </div>
  )
}
