import { Bar, BarChart, ReferenceLine, ResponsiveContainer, XAxis } from 'recharts'
import type { DailyLog, Profile } from '../api/types'
import { useUpdateProfile } from '../auth/useProfile'
import { Card } from '../components/ui'
import { useLang, useT } from '../i18n'
import { formatDate, type DateStr } from '../lib/date'
import { formatNumber, parseNumber } from '../lib/number'
import { useDailyForm } from '../nutrition/useDailyForm'
import { goalStreak, stepsAverage7, stepsByDay } from './stats'

type Props = {
  userId: string
  today: DateStr
  logs: DailyLog[]
  profile: Profile | null | undefined
}

const input =
  'min-h-12 w-full min-w-0 rounded-lg border border-border bg-surface-2 px-3 text-lg focus:border-accent focus:outline-none'

/** Today's steps (saved into the daily log), goal, 7-day average, streak and a week of bars. */
export function StepsCard({ userId, today, logs, profile }: Props) {
  const t = useT()
  const lang = useLang()
  const updateProfile = useUpdateProfile()
  const form = useDailyForm(
    userId,
    today,
    logs.find((log) => log.date === today),
  )

  // Show what was just typed in the stats too, before the server confirms it.
  const typed = form.number('steps')
  const current = logs.some((log) => log.date === today)
    ? logs.map((log) => (log.date === today ? { ...log, steps: typed } : log))
    : [...logs, { date: today, steps: typed }]

  const goal = profile?.step_goal ?? null
  const average = stepsAverage7(current, today)
  const streak = goalStreak(current, goal, today)
  const bars = stepsByDay(current, today)

  const stat = (label: string, value: string) => (
    <div className="min-w-0 flex-1">
      <p className="truncate text-xs text-muted">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  )

  return (
    <Card>
      <h2 className="mb-2 text-sm text-muted">{t('cardio.steps')}</h2>
      <div className="grid grid-cols-2 gap-3">
        <label className="block min-w-0">
          <span className="mb-1 block truncate text-sm text-muted">{t('cardio.stepsToday')}</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={form.value('steps')}
            onChange={(e) => form.change('steps', e.target.value)}
            className={input}
          />
        </label>
        <label className="block min-w-0">
          <span className="mb-1 block truncate text-sm text-muted">{t('cardio.stepGoal')}</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            key={goal ?? 'none'}
            defaultValue={goal ?? ''}
            onBlur={(e) => {
              const text = e.target.value.trim()
              const value = text === '' ? null : parseNumber(text)
              if (value === undefined || value === goal) return
              updateProfile.mutate({ step_goal: value === null ? null : Math.round(value) })
            }}
            className={input}
          />
        </label>
      </div>
      <p className="mt-1 text-xs text-muted">{t(`nut.status.${form.status}`)}</p>

      <div className="mt-3 flex gap-3">
        {stat(t('cardio.stepsAvg7'), average === undefined ? '–' : formatNumber(average, lang, 0))}
        {stat(t('cardio.stepsStreak'), goal ? t('cardio.days', { n: streak }) : '–')}
      </div>

      <div className="mt-3 h-28">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bars} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="date"
              tickFormatter={(date: string) => formatDate(date, lang, { weekday: 'short' })}
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            {goal ? <ReferenceLine y={goal} stroke="var(--muted)" strokeDasharray="4 4" /> : null}
            <Bar
              dataKey="steps"
              fill="var(--accent)"
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
