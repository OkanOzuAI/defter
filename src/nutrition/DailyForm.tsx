import { Link } from 'react-router-dom'
import type { DailyLog, Macros, Profile } from '../api/types'
import { useLang, useT, type TKey } from '../i18n'
import { kcalFromMacros, kcalMismatch, sodiumMgToSaltG } from '../lib/calc'
import type { DateStr } from '../lib/date'
import type { DayTargets } from '../lib/diet'
import { formatNumber } from '../lib/number'
import { useDailyForm, type NumberField } from './useDailyForm'

type Props = {
  userId: string
  date: DateStr
  log: DailyLog | undefined
  targets: DayTargets | undefined
  profile: Profile | null | undefined
  /** Macros of supplements set to count toward the day. */
  fromSupplements: Required<Macros>
  cardioMinutes: number
  /** Input to focus when the form appears ("Kilo gir" / "Kalori gir"). */
  focus?: NumberField
}

const inputClass =
  'min-h-12 w-full min-w-0 rounded-lg border bg-surface-2 px-3 text-lg placeholder:text-muted/50 focus:border-accent focus:outline-none'

export function DailyForm(props: Props) {
  const { userId, date, log, targets, profile, fromSupplements } = props
  const t = useT()
  const lang = useLang()
  const form = useDailyForm(userId, date, log)

  const number = (value: number, digits = 0) => formatNumber(value, lang, digits)

  function field(
    name: NumberField | 'salt_g',
    label: TKey,
    unit: TKey,
    target?: number | null,
    extra = 0,
  ) {
    const isSalt = name === 'salt_g'
    const current = isSalt
      ? (() => {
          const sodium = form.number('sodium_mg')
          return sodium === null ? null : sodiumMgToSaltG(sodium)
        })()
      : form.number(name)
    const total = current === null ? null : current + extra
    const invalid = form.invalid(name)
    return (
      <label className="block min-w-0">
        <span className="mb-1 flex items-baseline justify-between gap-2 text-sm text-muted">
          <span className="truncate">{t(label)}</span>
          <span className="shrink-0 text-xs">{t(unit)}</span>
        </span>
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          autoFocus={props.focus === name}
          value={isSalt ? form.saltValue() : form.value(name)}
          onChange={(e) => form.change(name, e.target.value)}
          aria-invalid={invalid}
          className={`${inputClass} ${invalid ? 'border-danger' : 'border-border'}`}
        />
        {invalid ? (
          <span className="mt-1 block text-xs text-danger">{t('nut.invalid')}</span>
        ) : (
          target != null &&
          target > 0 && (
            <>
              <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-surface-2">
                <span
                  className="block h-full bg-accent"
                  style={{ width: `${Math.min(100, ((total ?? 0) / target) * 100)}%` }}
                />
              </span>
              <span className="mt-1 block text-xs text-muted">
                {total === null ? '–' : number(total, 1)} / {number(target, 1)}
              </span>
            </>
          )
        )}
      </label>
    )
  }

  const protein = form.number('protein')
  const carbs = form.number('carbs')
  const fat = form.number('fat')
  const calories = form.number('calories')
  const macroKcal =
    protein !== null && carbs !== null && fat !== null
      ? kcalFromMacros(protein, carbs, fat)
      : undefined
  const mismatch = macroKcal !== undefined && calories !== null && kcalMismatch(calories, macroKcal)
  const steps = form.number('steps')
  const saltTarget = profile?.sodium_target_mg ? sodiumMgToSaltG(profile.sodium_target_mg) : null

  return (
    <div className="space-y-4">
      <p
        role="status"
        className={
          'text-xs ' +
          (form.status === 'error'
            ? 'text-danger'
            : form.status === 'saved'
              ? 'text-muted'
              : 'text-warn')
        }
      >
        {t(`nut.status.${form.status}`)}
      </p>

      {field('weight', 'nut.f.weight', 'unit.kg')}
      {field('calories', 'nut.f.calories', 'unit.kcal', targets?.kcal, fromSupplements.kcal)}
      {macroKcal !== undefined && (
        <p className={`-mt-2 text-xs ${mismatch ? 'text-warn' : 'text-muted'}`}>
          {t('nut.fromMacros', { kcal: number(macroKcal) })}
          {mismatch && ` · ${t('nut.macroMismatch')}`}
        </p>
      )}

      <div className="grid grid-cols-3 gap-3">
        {field('protein', 'nut.f.protein', 'unit.g', targets?.protein, fromSupplements.protein)}
        {field('carbs', 'nut.f.carbs', 'unit.g', targets?.carbs, fromSupplements.carbs)}
        {field('fat', 'nut.f.fat', 'unit.g', targets?.fat, fromSupplements.fat)}
      </div>
      {fromSupplements.kcal + fromSupplements.protein > 0 && (
        <p className="-mt-2 text-xs text-muted">
          {t('nut.fromSupplements', {
            kcal: number(fromSupplements.kcal),
            protein: number(fromSupplements.protein, 1),
          })}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {field('salt_g', 'nut.f.salt', 'unit.g', saltTarget)}
        {field('sodium_mg', 'nut.f.sodium', 'unit.mg', profile?.sodium_target_mg)}
      </div>
      <p className="-mt-2 text-xs text-muted">{t('nut.saltHint')}</p>

      <div className="grid grid-cols-3 gap-3">
        {field('fiber', 'nut.f.fiber', 'unit.g', profile?.fiber_target_g)}
        {field('water_l', 'nut.f.water', 'unit.l', profile?.water_target_l)}
        {field('sleep_h', 'nut.f.sleep', 'unit.h', profile?.sleep_target_h)}
      </div>

      <div>
        <p className="mb-1 text-sm text-muted">{t('nut.f.energy')}</p>
        <div className="flex overflow-hidden rounded-lg border border-border">
          {[1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              type="button"
              aria-pressed={form.energy === level}
              onClick={() => form.change('energy', form.energy === level ? '' : String(level))}
              className={
                'min-h-11 flex-1 border-l border-border first:border-l-0 ' +
                (form.energy === level ? 'bg-accent font-semibold text-accent-fg' : '')
              }
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm text-muted">{t('nut.f.note')}</span>
        <textarea
          rows={2}
          value={form.note}
          onChange={(e) => form.change('note', e.target.value)}
          className="block w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 focus:border-accent focus:outline-none"
        />
      </label>

      <Link
        to="/cardio"
        className="flex min-h-11 items-center justify-between gap-3 border-t border-border pt-2 text-sm text-muted"
      >
        <span>
          {t('nut.activity', {
            steps: steps === null ? '–' : number(steps),
            minutes: number(props.cardioMinutes),
          })}
        </span>
        <span className="shrink-0 text-accent">{t('nut.activityLink')} ›</span>
      </Link>
    </div>
  )
}
