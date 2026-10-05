import type { DailyLog, DietPhase, Profile } from '../api/types'
import { Card } from '../components/ui'
import { useLang, useT } from '../i18n'
import type { DateStr } from '../lib/date'
import { phaseDay, type DayTargets } from '../lib/diet'
import { formatNumber } from '../lib/number'
import { maintenance, weightSummary } from './summary'

type Props = {
  logs: DailyLog[]
  today: DateStr
  profile: Profile | null | undefined
  phase: DietPhase | undefined
  targets: DayTargets | undefined
  isTrainingDay: boolean
  /** Today's intake including supplements that count. */
  intake: { kcal: number | null; protein: number | null }
  onEnterWeight: () => void
  onEnterCalories: () => void
}

const quick = 'min-h-11 rounded-lg border border-border px-3 text-sm text-accent'

/** "Mevcut kilo & kalori": always on top of Beslenme. */
export function WeightCaloriesCard(props: Props) {
  const { logs, today, profile, phase, targets, intake } = props
  const t = useT()
  const lang = useLang()
  const weight = weightSummary(logs, today, phase, profile?.goal_weight)
  const tdee = maintenance(logs, today, profile, weight.avg7 ?? weight.latest)

  const kg = (value: number, digits = 1) => `${formatNumber(value, lang, digits)} kg`
  const signed = (value: number, digits = 1) =>
    `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatNumber(Math.abs(value), lang, digits)}`

  const row = (label: string, value: string) => (
    <div className="flex items-baseline justify-between gap-3 py-0.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )

  const remainingKcal =
    targets?.kcal != null && intake.kcal !== null ? targets.kcal - intake.kcal : undefined
  const remainingProtein =
    targets?.protein != null && intake.protein !== null
      ? targets.protein - intake.protein
      : undefined

  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm text-muted">{t('nut.cardTitle')}</h2>
        {phase && (
          <span className="shrink-0 text-xs text-muted">
            {t(`phase.${phase.type}`)} · {t('phase.day', { n: phaseDay(phase, today) })}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted">{t('nut.weight')}</p>
          <p className="text-2xl font-semibold leading-tight">
            {weight.latest === undefined ? '–' : kg(weight.latest, 2)}
          </p>
        </div>
        <button type="button" className={quick} onClick={props.onEnterWeight}>
          {t('nut.enterWeight')}
        </button>
      </div>
      <div className="mt-1">
        {weight.latest === undefined
          ? row(t('nut.noWeight'), '')
          : row(t('nut.avg7'), weight.avg7 === undefined ? '–' : kg(weight.avg7, 2))}
        {weight.latest !== undefined && weight.avg7 === undefined && (
          <p className="text-xs text-muted">{t('nut.avg7Need')}</p>
        )}
        {weight.weekly &&
          row(
            t('nut.vsLastWeek'),
            `${signed(weight.weekly.kg, 2)} kg (${signed(weight.weekly.pct, 2)}%)`,
          )}
        {weight.sincePhaseStart !== undefined &&
          row(t('nut.sincePhase'), `${signed(weight.sincePhaseStart, 1)} kg`)}
        {weight.toGoal !== undefined && row(t('nut.toGoal'), `${signed(weight.toGoal, 1)} kg`)}
      </div>

      <div className="mt-3 flex items-end justify-between gap-3 border-t border-border pt-3">
        <div className="min-w-0">
          <p className="text-xs text-muted">
            {t('nut.calories')} · {t(props.isTrainingDay ? 'nut.trainingDay' : 'nut.restDay')}
          </p>
          <p className="text-2xl font-semibold leading-tight">
            {intake.kcal === null ? '–' : formatNumber(intake.kcal, lang, 0)}
            {targets?.kcal != null && (
              <span className="text-base font-normal text-muted">
                {' '}
                / {formatNumber(targets.kcal, lang, 0)}
              </span>
            )}
          </p>
        </div>
        <button type="button" className={quick} onClick={props.onEnterCalories}>
          {t('nut.enterCalories')}
        </button>
      </div>
      <div className="mt-1">
        {targets?.kcal == null && <p className="text-xs text-muted">{t('nut.noTarget')}</p>}
        {remainingKcal !== undefined &&
          row(
            t(remainingKcal >= 0 ? 'nut.remaining' : 'nut.over'),
            `${formatNumber(Math.abs(remainingKcal), lang, 0)} kcal`,
          )}
        {remainingProtein !== undefined &&
          row(
            `${t('nut.f.protein')} · ${t(remainingProtein >= 0 ? 'nut.remaining' : 'nut.over')}`,
            `${formatNumber(Math.abs(remainingProtein), lang, 0)} g`,
          )}
      </div>

      <div className="mt-3 border-t border-border pt-3">
        {row(
          t('nut.maintenance'),
          tdee ? `${formatNumber(Math.round(tdee.kcal / 10) * 10, lang, 0)} kcal` : '–',
        )}
        <p className="text-xs text-muted">
          {tdee
            ? t(tdee.source === 'adaptive' ? 'nut.tdeeAdaptive' : 'nut.tdeeFormula')
            : t('nut.tdeeNone')}
        </p>
      </div>
    </Card>
  )
}
