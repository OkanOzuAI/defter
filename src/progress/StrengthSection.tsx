import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getDailyLogs } from '../api/dailyLogs'
import { getExerciseSets, getLoggedExerciseIds } from '../api/workouts'
import { useProfile } from '../auth/useProfile'
import { Card, Select } from '../components/ui'
import { useLang, useT } from '../i18n'
import { recentBodyweight } from '../lib/calc'
import { formatDate } from '../lib/date'
import { formatNumber } from '../lib/number'
import { resolveExercise } from '../workout/exercises'
import { setText } from '../workout/history'
import { workoutKey } from '../workout/hooks'
import { ChartBox, SectionTitle } from './chart'
import { axis, grid, tooltip } from './chartStyle'
import { repRecords, strengthSessions } from './series'

export function StrengthSection({ userId }: { userId: string }) {
  const t = useT()
  const lang = useLang()
  const { data: profile } = useProfile()
  const [picked, setPicked] = useState<string | null>(null)

  const ids = useQuery({
    queryKey: [...workoutKey(userId), 'logged-exercises'],
    queryFn: getLoggedExerciseIds,
  })
  const id = picked ?? ids.data?.[0] ?? ''
  const exercise = resolveExercise(id)
  const sets = useQuery({
    queryKey: [...workoutKey(userId), 'exercise', id],
    queryFn: () => getExerciseSets(id),
    enabled: Boolean(id),
  })
  const first = sets.data?.[0]?.date
  const last = sets.data?.at(-1)?.date
  const needsBodyweight = exercise.loadMode === 'added_bodyweight'
  const weighIns = useQuery({
    queryKey: ['daily-logs', userId, first, last, 'weights'],
    queryFn: () => getDailyLogs(first!, last!),
    enabled: Boolean(needsBodyweight && first && last),
  })

  if (ids.isPending) return <p className="py-6 text-sm text-muted">{t('app.loading')}</p>
  if (!ids.data || ids.data.length === 0) {
    return <p className="py-6 text-sm text-muted">{t('prog.noExercises')}</p>
  }

  const display = profile?.intensity_display ?? 'rir'
  const sessions = strengthSessions(sets.data ?? [], exercise, (date) =>
    needsBodyweight ? recentBodyweight(weighIns.data ?? [], date) : undefined,
  )
  const withE1rm = sessions.filter((session) => session.e1rm !== null)
  const bestE1rm = withE1rm.reduce<(typeof sessions)[number] | undefined>(
    (best, session) => (!best || session.e1rm! > best.e1rm! ? session : best),
    undefined,
  )
  const records = repRecords(sets.data ?? [])
  const short = (date: string) => formatDate(date, lang, { day: 'numeric', month: 'short' })
  const full = (date: string) =>
    formatDate(date, lang, { day: 'numeric', month: 'short', year: 'numeric' })
  const number = (value: number, digits = 1) => formatNumber(value, lang, digits)

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm text-muted">{t('prog.pickExercise')}</span>
        <Select value={id} onChange={(e) => setPicked(e.target.value)}>
          {ids.data.map((value) => (
            <option key={value} value={value}>
              {resolveExercise(value).name}
            </option>
          ))}
        </Select>
      </label>

      {sets.isPending ? (
        <p className="py-6 text-sm text-muted">{t('app.loading')}</p>
      ) : (
        <>
          <Card>
            <SectionTitle>{t('prog.e1rmTitle')}</SectionTitle>
            {withE1rm.length < 2 ? (
              <p className="text-sm text-muted">
                {withE1rm.length === 1 && (
                  <span className="mr-2 text-lg font-semibold text-text">
                    {number(withE1rm[0].e1rm!)} kg
                  </span>
                )}
                {t('ex.e1rmHint')}
              </p>
            ) : (
              <ChartBox>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={withE1rm} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
                    <CartesianGrid {...grid} />
                    <XAxis dataKey="date" tickFormatter={short} minTickGap={28} {...axis} />
                    <YAxis
                      domain={['auto', 'auto']}
                      tickFormatter={(value: number) => number(value, 0)}
                      {...axis}
                    />
                    <Tooltip
                      {...tooltip}
                      labelFormatter={(label) => short(String(label))}
                      formatter={(value) => [`${number(Number(value))} kg`, 'e1RM']}
                    />
                    <Line
                      dataKey="e1rm"
                      type="monotone"
                      stroke="var(--accent)"
                      strokeWidth={2}
                      dot={{
                        r: 4,
                        fill: 'var(--accent)',
                        stroke: 'var(--surface)',
                        strokeWidth: 2,
                      }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartBox>
            )}
          </Card>

          {sessions.length > 1 && (
            <Card>
              <SectionTitle>{t('prog.volumeTitle')}</SectionTitle>
              <ChartBox height={140}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sessions} margin={{ top: 8, right: 8, bottom: 0, left: -6 }}>
                    <CartesianGrid {...grid} />
                    <XAxis dataKey="date" tickFormatter={short} minTickGap={28} {...axis} />
                    <YAxis tickFormatter={(value: number) => number(value, 0)} {...axis} />
                    <Tooltip
                      {...tooltip}
                      cursor={{ fill: 'var(--surface-2)' }}
                      labelFormatter={(label) => short(String(label))}
                      formatter={(value) => [`${number(Number(value), 0)} kg`, t('sum.volume')]}
                    />
                    <Bar
                      dataKey="volume"
                      fill="var(--accent)"
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartBox>
            </Card>
          )}

          <Card>
            <SectionTitle>{t('prog.prTable')}</SectionTitle>
            <dl className="space-y-1 text-sm">
              {bestE1rm && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t('prog.prE1rm')}</dt>
                  <dd>
                    {number(bestE1rm.e1rm!)} kg · {full(bestE1rm.date)}
                  </dd>
                </div>
              )}
              {records[0] && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t('prog.prWeight')}</dt>
                  <dd>
                    {number(records[0].weight, 2)} kg × {records[0].reps} · {full(records[0].date)}
                  </dd>
                </div>
              )}
            </dl>
            {records.length > 1 && (
              <>
                <p className="mb-1 mt-3 text-xs text-muted">{t('prog.prReps')}</p>
                <ul className="text-sm">
                  {records.slice(0, 8).map((record) => (
                    <li
                      key={record.weight}
                      className="flex justify-between gap-3 border-t border-border py-1"
                    >
                      <span>
                        {number(record.weight, 2)} kg × {record.reps}
                      </span>
                      <span className="text-muted">{full(record.date)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          <Card>
            <SectionTitle>{t('prog.bestSet')}</SectionTitle>
            <ul className="text-sm">
              {[...sessions]
                .reverse()
                .slice(0, 12)
                .map((session) => (
                  <li
                    key={session.date + session.best?.id}
                    className="flex justify-between gap-3 border-t border-border py-1.5 first:border-t-0"
                  >
                    <span className="text-muted">{full(session.date)}</span>
                    <span>{session.best ? setText(session.best, lang, display, t) : '–'}</span>
                  </li>
                ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  )
}
