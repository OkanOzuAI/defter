import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useProfile } from '../auth/useProfile'
import { Card } from '../components/ui'
import { useLang, useT } from '../i18n'
import { movingAverage7, sodiumMgToSaltG } from '../lib/calc'
import { addDays, formatDate, today as todayDate } from '../lib/date'
import { activePhase, dayTargets, phaseDay, supplementMacros } from '../lib/diet'
import { formatNumber } from '../lib/number'
import {
  useCardioSessions,
  useDailyLogs,
  useDietPhases,
  useSupplementLogs,
  useSupplements,
  useTrainingDates,
} from '../nutrition/hooks'
import { SupplementLogger } from '../nutrition/SupplementLogger'
import { WorkoutStarter } from '../workout/WorkoutStarter'

export function TodayPage() {
  const t = useT()
  const lang = useLang()
  const { user } = useAuth()
  const userId = user!.id
  const { data: profile } = useProfile()
  const today = todayDate()

  const phases = useDietPhases(userId).data ?? []
  const phase = activePhase(phases, today)
  const logs = useDailyLogs(userId, addDays(today, -6), today).data ?? []
  const log = logs.find((entry) => entry.date === today)
  const trainingDates = useTrainingDates(userId, today, today)
  const cardio = useCardioSessions(userId, today, today).data ?? []
  const extra = supplementMacros(
    useSupplementLogs(userId, today, today).data ?? [],
    useSupplements(userId).data ?? [],
  )

  const targets = phase && dayTargets(phase, today, trainingDates.has(today))
  const average = movingAverage7(logs, today)
  const latest = logs.findLast((entry) => entry.weight !== null)?.weight
  const number = (value: number, digits = 0) => formatNumber(value, lang, digits)

  /** "2150 / 2400 kcal" with a bar when there is a target. */
  const meter = (
    label: string,
    value: number | null | undefined,
    target: number | null | undefined,
    unit: string,
    digits = 0,
  ) => (
    <div className="py-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted">{label}</span>
        <span>
          {value == null ? '–' : number(value, digits)}
          {target != null && <span className="text-muted"> / {number(target, digits)}</span>} {unit}
        </span>
      </div>
      {target != null && target > 0 && (
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full bg-accent"
            style={{ width: `${Math.min(100, ((value ?? 0) / target) * 100)}%` }}
          />
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">
          {formatDate(today, lang, { weekday: 'long', day: 'numeric', month: 'long' })}
        </h1>
        {phase && (
          <p className="text-sm text-muted">
            {t(`phase.${phase.type}`)} · {t('phase.day', { n: phaseDay(phase, today) })}
          </p>
        )}
      </div>

      <WorkoutStarter userId={userId} title={t('today.choose')} />

      <Card>
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="text-sm text-muted">
              {t(average !== undefined ? 'today.weightAvg' : 'today.weightLatest')}
            </p>
            <p className="text-2xl font-semibold leading-tight">
              {average !== undefined
                ? `${number(average, 2)} kg`
                : latest != null
                  ? `${number(latest, 2)} kg`
                  : '–'}
            </p>
          </div>
          <Link to="/nutrition" className="flex min-h-11 shrink-0 items-center text-sm text-accent">
            {t('today.log')} ›
          </Link>
        </div>
        <div className="mt-2 border-t border-border pt-1">
          {meter(
            `${t('nut.calories')} · ${t(trainingDates.has(today) ? 'nut.trainingDay' : 'nut.restDay')}`,
            log?.calories == null ? null : log.calories + extra.kcal,
            targets?.kcal,
            'kcal',
          )}
          {meter(
            t('nut.f.protein'),
            log?.protein == null ? null : log.protein + extra.protein,
            targets?.protein,
            'g',
          )}
          {meter(
            t('today.salt'),
            log?.sodium_mg == null ? null : sodiumMgToSaltG(log.sodium_mg),
            profile?.sodium_target_mg ? sodiumMgToSaltG(profile.sodium_target_mg) : null,
            'g',
            1,
          )}
          {meter(t('nut.f.sodium'), log?.sodium_mg, profile?.sodium_target_mg, 'mg')}
          {meter(t('nut.f.water'), log?.water_l, profile?.water_target_l, 'L', 1)}
        </div>
      </Card>

      <Card>
        <Link to="/cardio" className="block">
          {meter(t('cardio.steps'), log?.steps, profile?.step_goal, '')}
          {meter(
            t('today.cardio'),
            cardio.reduce((sum, session) => sum + (session.duration_min ?? 0), 0),
            null,
            lang === 'tr' ? 'dk' : 'min',
          )}
        </Link>
      </Card>

      <Card>
        <h2 className="mb-1 font-medium">{t('sup.title')}</h2>
        <SupplementLogger userId={userId} date={today} />
      </Card>
    </div>
  )
}
