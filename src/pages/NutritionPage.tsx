import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useProfile } from '../auth/useProfile'
import { Card } from '../components/ui'
import { useLang, useT } from '../i18n'
import { addDays, formatDate, today as todayDate } from '../lib/date'
import { activePhase, dayTargets, supplementMacros } from '../lib/diet'
import { DailyForm } from '../nutrition/DailyForm'
import {
  useCardioSessions,
  useDailyLogs,
  useDietPhases,
  useSupplementLogs,
  useSupplements,
  useTrainingDates,
} from '../nutrition/hooks'
import { MonthCalendar } from '../nutrition/MonthCalendar'
import { SupplementLogger } from '../nutrition/SupplementLogger'
import type { NumberField } from '../nutrition/useDailyForm'
import { WeightCaloriesCard } from '../nutrition/WeightCaloriesCard'

export function NutritionPage() {
  const t = useT()
  const lang = useLang()
  const { user } = useAuth()
  const userId = user!.id
  const { data: profile } = useProfile()
  const today = todayDate()
  const [date, setDate] = useState(today)
  const [calendar, setCalendar] = useState(false)
  // Bumping `nonce` remounts the form so the requested input takes focus.
  const [focus, setFocus] = useState<{ field: NumberField; nonce: number }>()

  const phases = useDietPhases(userId).data ?? []
  const phaseToday = activePhase(phases, today)
  const phaseOfDate = activePhase(phases, date)

  // Enough history for the 7-day average, last week's average, the 21-day TDEE and the phase start.
  const from = [addDays(today, -35), phaseToday?.start_date ?? today].sort()[0]
  const recent = useDailyLogs(userId, from, today)
  const selected = useDailyLogs(userId, date, date)
  const trainingDates = useTrainingDates(userId, date < today ? date : today, today)
  const supplements = useSupplements(userId).data ?? []
  const supplementLogs = useSupplementLogs(userId, date, date).data ?? []
  const todaySupplementLogs = useSupplementLogs(userId, today, today).data ?? []
  const cardio = useCardioSessions(userId, date, date).data ?? []

  const todayLog = recent.data?.find((log) => log.date === today)
  const todayExtra = supplementMacros(todaySupplementLogs, supplements)
  const targetsToday = phaseToday && dayTargets(phaseToday, today, trainingDates.has(today))
  const targetsOfDate = phaseOfDate && dayTargets(phaseOfDate, date, trainingDates.has(date))

  const jumpTo = (field: NumberField) => {
    setDate(today)
    setFocus({ field, nonce: (focus?.nonce ?? 0) + 1 })
  }
  const arrow = 'size-11 shrink-0 rounded-lg border border-border text-lg disabled:opacity-30'

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t('nav.nutrition')}</h1>

      <WeightCaloriesCard
        logs={recent.data ?? []}
        today={today}
        profile={profile}
        phase={phaseToday}
        targets={targetsToday}
        isTrainingDay={trainingDates.has(today)}
        intake={{
          kcal: todayLog?.calories == null ? null : todayLog.calories + todayExtra.kcal,
          protein: todayLog?.protein == null ? null : todayLog.protein + todayExtra.protein,
        }}
        onEnterWeight={() => jumpTo('weight')}
        onEnterCalories={() => jumpTo('calories')}
      />

      <section>
        <h2 className="mb-2 font-medium">{t('nut.dailyLog')}</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={t('nut.prevDay')}
            className={arrow}
            onClick={() => setDate(addDays(date, -1))}
          >
            ‹
          </button>
          <button
            type="button"
            aria-expanded={calendar}
            aria-label={t('nut.calendar')}
            onClick={() => setCalendar((open) => !open)}
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-border px-2 text-center"
          >
            <span className="block truncate font-medium">
              {date === today ? `${t('nut.today')} · ` : ''}
              {formatDate(date, lang, { day: 'numeric', month: 'long', weekday: 'short' })}
            </span>
            <span className="block text-xs text-muted">
              {t(trainingDates.has(date) ? 'nut.trainingDay' : 'nut.restDay')}
            </span>
          </button>
          <button
            type="button"
            aria-label={t('nut.nextDay')}
            className={arrow}
            disabled={date >= today}
            onClick={() => setDate(addDays(date, 1))}
          >
            ›
          </button>
        </div>

        {calendar && (
          <div className="mt-2">
            <MonthCalendar
              key={date.slice(0, 7)}
              userId={userId}
              selected={date}
              today={today}
              onPick={(day) => {
                setDate(day)
                setCalendar(false)
              }}
            />
          </div>
        )}

        <div className="mt-3">
          {selected.isPending && selected.fetchStatus === 'fetching' ? (
            <p className="py-6 text-sm text-muted">{t('app.loading')}</p>
          ) : (
            // Offline the form still opens: typed values wait on the device.
            <DailyForm
              key={`${date}-${focus?.nonce ?? 0}`}
              userId={userId}
              date={date}
              log={selected.data?.[0]}
              targets={targetsOfDate}
              profile={profile}
              fromSupplements={supplementMacros(supplementLogs, supplements)}
              cardioMinutes={cardio.reduce((sum, s) => sum + (s.duration_min ?? 0), 0)}
              focus={date === today ? focus?.field : undefined}
            />
          )}
        </div>
      </section>

      <Card>
        <h2 className="mb-1 font-medium">{t('sup.title')}</h2>
        <SupplementLogger userId={userId} date={date} />
      </Card>
    </div>
  )
}
