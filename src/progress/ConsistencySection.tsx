import { useQuery } from '@tanstack/react-query'
import { getSessionDates } from '../api/workouts'
import { Card } from '../components/ui'
import { useLang, useT } from '../i18n'
import { addDays, dateRange, formatDate, weekdayNames, type DateStr } from '../lib/date'
import { adherence } from '../lib/diet'
import { useSupplementLogs, useSupplements } from '../nutrition/hooks'
import { workoutKey } from '../workout/hooks'
import { SectionTitle } from './chart'
import { weekStarts } from './series'

const WEEKS = 12

export function ConsistencySection({ userId, today }: { userId: string; today: DateStr }) {
  const t = useT()
  const lang = useLang()
  const weeks = weekStarts(today, WEEKS)
  const trained = useQuery({
    queryKey: [...workoutKey(userId), 'dates', weeks[0], today],
    queryFn: () => getSessionDates(weeks[0], today),
  })
  const supplements = useSupplements(userId).data ?? []
  const logs = useSupplementLogs(userId, addDays(today, -29), today).data ?? []

  const days = new Set(trained.data ?? [])
  const names = weekdayNames(lang)

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>{t('prog.heatmapTitle')}</SectionTitle>
        <p className="mb-3 text-lg font-semibold">{t('prog.sessionsCount', { n: days.size })}</p>
        {/* Rows are weekdays, columns are weeks, oldest on the left. */}
        <div className="flex gap-1">
          <div className="flex flex-col gap-1 pr-1 text-[10px] leading-none text-muted">
            {names.map((name) => (
              <span key={name} className="flex h-5 items-center">
                {name}
              </span>
            ))}
          </div>
          {weeks.map((week) => (
            <div key={week} className="flex min-w-0 flex-1 flex-col gap-1">
              {dateRange(week, addDays(week, 6)).map((day) => (
                <span
                  key={day}
                  title={`${formatDate(day, lang)}${days.has(day) ? ` · ${t('prog.trained')}` : ''}`}
                  className={
                    'h-5 rounded-sm ' +
                    (day > today ? 'bg-transparent' : days.has(day) ? 'bg-accent' : 'bg-surface-2')
                  }
                />
              ))}
            </div>
          ))}
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
          <span className="inline-block size-3 rounded-sm bg-accent" /> {t('prog.trained')}
        </p>
      </Card>

      <Card>
        <SectionTitle>{t('prog.adherenceTitle')}</SectionTitle>
        <ul className="text-sm">
          {supplements
            .filter((supplement) => supplement.active)
            .map((supplement) => {
              const stats = adherence(
                logs.filter((log) => log.supplement_id === supplement.id).map((log) => log.date),
                today,
              )
              return (
                <li key={supplement.id} className="border-t border-border py-2 first:border-t-0">
                  <div className="flex justify-between gap-3">
                    <span className="min-w-0 truncate">{supplement.name}</span>
                    <span className="shrink-0 text-muted">
                      {t('sup.adherence', {
                        p7: Math.round(stats.pct7),
                        p30: Math.round(stats.pct30),
                        streak: stats.streak,
                      })}
                    </span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full bg-accent" style={{ width: `${stats.pct30}%` }} />
                  </div>
                </li>
              )
            })}
        </ul>
      </Card>
    </div>
  )
}
