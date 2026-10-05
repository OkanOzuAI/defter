import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useProfile } from '../auth/useProfile'
import { Card } from '../components/ui'
import { useLang, useT, type TKey } from '../i18n'
import { addDays, formatDate, type DateStr } from '../lib/date'
import { formatNumber } from '../lib/number'
import { useCardioSessions, useDailyLogs } from '../nutrition/hooks'
import { ChartBox, Legend, SectionTitle } from './chart'
import { axis, grid, SERIES, tooltip } from './chartStyle'
import { cardioWeekly, OTHER, weekStarts } from './series'

export function CardioSection({
  userId,
  today,
  days,
}: {
  userId: string
  today: DateStr
  days: number
}) {
  const t = useT()
  const lang = useLang()
  const { data: profile } = useProfile()
  const weeks = weekStarts(today, Math.max(4, Math.ceil(days / 7)))
  const sessions = useCardioSessions(userId, weeks[0], today)
  const from = addDays(today, -(days - 1))
  const logs = useDailyLogs(userId, from, today)

  if (sessions.isPending || logs.isPending) {
    return <p className="py-6 text-sm text-muted">{t('app.loading')}</p>
  }
  const { types, rows } = cardioWeekly(sessions.data ?? [], weeks)
  const steps = (logs.data ?? []).filter((log) => log.steps !== null)
  const short = (date: string) => formatDate(date, lang, { day: 'numeric', month: 'short' })
  const number = (value: number) => formatNumber(value, lang, 0)
  const typeName = (type: string) =>
    type === OTHER ? t('prog.otherTypes') : t(`cardio.t.${type}` as TKey)
  // The folded "other" series is always grey, so a real type never changes colour.
  const color = (type: string, index: number) => (type === OTHER ? 'var(--muted)' : SERIES[index])

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>{t('prog.cardioTitle')}</SectionTitle>
        {types.length === 0 ? (
          <p className="py-4 text-sm text-muted">{t('prog.noData')}</p>
        ) : (
          <>
            <ChartBox>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
                  <CartesianGrid {...grid} />
                  <XAxis dataKey="week" tickFormatter={short} minTickGap={24} {...axis} />
                  <YAxis tickFormatter={number} {...axis} />
                  <Tooltip
                    {...tooltip}
                    cursor={{ fill: 'var(--surface-2)' }}
                    labelFormatter={(label) => short(String(label))}
                    formatter={(value, name) => [
                      t('cardio.minutes', { n: number(Number(value)) }),
                      typeName(String(name)),
                    ]}
                  />
                  {types.map((type, i) => (
                    <Bar
                      key={type}
                      dataKey={type}
                      stackId="minutes"
                      fill={color(type, i)}
                      stroke="var(--surface)"
                      strokeWidth={1}
                      isAnimationActive={false}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>
            <Legend
              items={types.map((type, i) => ({ label: typeName(type), color: color(type, i) }))}
            />
          </>
        )}
      </Card>

      <Card>
        <SectionTitle>{t('prog.stepsTitle')}</SectionTitle>
        {steps.length < 2 ? (
          <p className="py-4 text-sm text-muted">{t('prog.noData')}</p>
        ) : (
          <>
            <ChartBox height={160}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={steps} margin={{ top: 8, right: 8, bottom: 0, left: -2 }}>
                  <CartesianGrid {...grid} />
                  <XAxis dataKey="date" tickFormatter={short} minTickGap={32} {...axis} />
                  <YAxis tickFormatter={number} {...axis} />
                  <Tooltip
                    {...tooltip}
                    labelFormatter={(label) => short(String(label))}
                    formatter={(value) => [number(Number(value)), t('cardio.steps')]}
                  />
                  {profile?.step_goal ? (
                    <ReferenceLine
                      y={profile.step_goal}
                      stroke="var(--muted)"
                      strokeDasharray="4 4"
                    />
                  ) : null}
                  <Line
                    dataKey="steps"
                    type="monotone"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartBox>
            {profile?.step_goal ? (
              <Legend
                items={[
                  { label: t('cardio.steps'), color: 'var(--accent)' },
                  {
                    label: `${t('cardio.stepGoal')} (${number(profile.step_goal)})`,
                    color: 'var(--muted)',
                    dashed: true,
                  },
                ]}
              />
            ) : null}
          </>
        )}
      </Card>
    </div>
  )
}
