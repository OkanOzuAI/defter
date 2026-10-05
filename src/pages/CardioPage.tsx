import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { deleteCardioSession } from '../api/cardio'
import { isNetworkError } from '../api/errors'
import type { CardioSession } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { useProfile } from '../auth/useProfile'
import { CardioFormCard } from '../cardio/CardioFormCard'
import { derivedText } from '../cardio/form'
import { weekSummary } from '../cardio/stats'
import { StepsCard } from '../cardio/StepsCard'
import { Button, Card, Message } from '../components/ui'
import { useLang, useT, type TKey } from '../i18n'
import { addDays, formatDate, startOfWeek, today as todayDate } from '../lib/date'
import { formatNumber } from '../lib/number'
import { cardioKey, useCardioSessions, useDailyLogs } from '../nutrition/hooks'

export function CardioPage() {
  const t = useT()
  const lang = useLang()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userId = user!.id
  const { data: profile } = useProfile()
  const today = todayDate()
  const speedUnit = profile?.speed_unit ?? 'kmh'
  // false = closed, true = new entry, a session = editing it
  const [form, setForm] = useState<boolean | CardioSession>(false)

  const logs = useDailyLogs(userId, addDays(today, -60), today)
  const sessions = useCardioSessions(userId, addDays(today, -27), today)
  const remove = useMutation({
    mutationFn: deleteCardioSession,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cardioKey(userId) }),
  })

  const weightKg = logs.data?.findLast((log) => log.weight !== null)?.weight ?? undefined
  const all = sessions.data ?? []
  const recent = all.filter((session) => session.date >= addDays(today, -13))
  const week = weekSummary(all, logs.data ?? [], startOfWeek(today))
  const number = (value: number, digits = 0) => formatNumber(value, lang, digits)

  const stat = (label: string, value: string) => (
    <div className="min-w-0 flex-1">
      <p className="truncate text-xs text-muted">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  )

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t('nav.cardio')}</h1>

      <StepsCard userId={userId} today={today} logs={logs.data ?? []} profile={profile} />

      {form === false ? (
        <Button block onClick={() => setForm(true)}>
          + {t('cardio.add')}
        </Button>
      ) : (
        <CardioFormCard
          key={form === true ? 'new' : form.id}
          userId={userId}
          today={today}
          speedUnit={speedUnit}
          weightKg={weightKg}
          editing={form === true ? undefined : form}
          last={all[0]}
          onClose={() => setForm(false)}
        />
      )}

      <Card>
        <h2 className="mb-2 text-sm text-muted">{t('cardio.week')}</h2>
        <div className="flex gap-3">
          {stat(t('cardio.weekMinutes'), t('cardio.minutes', { n: number(week.minutes) }))}
          {stat(t('cardio.weekDistance'), `${number(week.distanceKm, 1)} km`)}
          {stat(t('cardio.weekKcal'), `${week.kcalEstimated ? '~' : ''}${number(week.kcal)} kcal`)}
          {stat(
            t('cardio.weekSteps'),
            week.stepsAverage === undefined ? '–' : number(week.stepsAverage),
          )}
        </div>
        {week.minutesByType.length > 0 && (
          <ul className="mt-3 border-t border-border pt-2 text-sm">
            {week.minutesByType.map(({ type, minutes }) => (
              <li key={type} className="flex justify-between gap-3 py-0.5">
                <span className="text-muted">{t(`cardio.t.${type}` as TKey)}</span>
                <span>{t('cardio.minutes', { n: number(minutes) })}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <section>
        <h2 className="mb-1 font-medium">{t('cardio.recent')}</h2>
        {sessions.isPending ? (
          <p className="py-6 text-sm text-muted">{t('app.loading')}</p>
        ) : sessions.isError ? (
          <Message
            title={t(isNetworkError(sessions.error) ? 'app.serverUnreachable' : 'common.error')}
            body={t('app.serverUnreachableHint')}
            action={<Button onClick={() => sessions.refetch()}>{t('app.retry')}</Button>}
          />
        ) : recent.length === 0 ? (
          <p className="py-6 text-sm text-muted">{t('cardio.empty')}</p>
        ) : (
          <ul>
            {recent.map((session) => {
              const derived = derivedText(session, speedUnit, lang)
              const facts = [
                session.duration_min !== null &&
                  t('cardio.minutes', { n: number(session.duration_min, 1) }),
                session.distance_km !== null && `${number(session.distance_km, 2)} km`,
                derived,
                session.incline_pct !== null && `%${number(session.incline_pct, 1)}`,
                session.kcal !== null &&
                  `${number(session.kcal)} kcal${session.kcal_estimated ? ` (${t('cardio.estimated')})` : ''}`,
              ].filter(Boolean)
              return (
                <li key={session.id} className="border-b border-border py-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate font-medium">
                      {t(`cardio.t.${session.type}` as TKey)}
                    </span>
                    <span className="shrink-0 text-sm text-muted">
                      {formatDate(session.date, lang, {
                        day: 'numeric',
                        month: 'short',
                        weekday: 'short',
                      })}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted">{facts.join(' · ')}</p>
                  {session.note && <p className="mt-0.5 text-sm text-muted">{session.note}</p>}
                  <div className="mt-1 flex gap-4">
                    <button
                      type="button"
                      className="min-h-11 text-sm text-accent"
                      onClick={() => {
                        setForm(session)
                        document.querySelector('main')?.scrollTo({ top: 0 })
                      }}
                    >
                      {t('workout.edit')}
                    </button>
                    <button
                      type="button"
                      className="min-h-11 text-sm text-danger"
                      onClick={() => {
                        if (window.confirm(t('cardio.deleteConfirm'))) remove.mutate(session.id)
                      }}
                    >
                      {t('cardio.delete')}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
