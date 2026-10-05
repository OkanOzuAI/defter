import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getDailyLogs } from '../api/dailyLogs'
import { isNetworkError } from '../api/errors'
import { getExerciseSets } from '../api/workouts'
import { useAuth } from '../auth/AuthContext'
import { useProfile } from '../auth/useProfile'
import { Button, Card, Message } from '../components/ui'
import { useLang, useT } from '../i18n'
import { recentBodyweight } from '../lib/calc'
import { formatDate } from '../lib/date'
import { formatNumber } from '../lib/number'
import { useExercises } from '../workout/exercises'
import { bestE1rm, setText, sortSetRows } from '../workout/history'
import { workoutKey } from '../workout/hooks'
import type { SetRow } from '../workout/types'

export function ExerciseHistoryPage() {
  const { id = '' } = useParams()
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user?.id
  const { data: profile } = useProfile()
  const exercise = useExercises().get(id)
  const needsBodyweight = exercise.loadMode === 'added_bodyweight'

  const sets = useQuery({
    queryKey: [...workoutKey(userId), 'exercise', id],
    queryFn: () => getExerciseSets(id),
    enabled: Boolean(userId && id),
  })
  const first = sets.data?.[0]?.date
  const last = sets.data?.at(-1)?.date
  // Bodyweight-loaded lifts need the weigh-ins around each session for their e1RM.
  const weighIns = useQuery({
    queryKey: ['daily-logs', userId, first, last, 'weights'],
    queryFn: () => getDailyLogs(first!, last!),
    enabled: Boolean(userId && needsBodyweight && first && last),
  })

  if (sets.isPending) return <p className="py-6 text-sm text-muted">{t('app.loading')}</p>
  if (sets.isError) {
    return (
      <Message
        title={t(isNetworkError(sets.error) ? 'app.serverUnreachable' : 'common.error')}
        body={t('app.serverUnreachableHint')}
        action={<Button onClick={() => sets.refetch()}>{t('app.retry')}</Button>}
      />
    )
  }

  const display = profile?.intensity_display ?? 'rir'
  const bySession = new Map<string, SetRow[]>()
  for (const row of sets.data) {
    if (row.done) bySession.set(row.session_id, [...(bySession.get(row.session_id) ?? []), row])
  }
  const sessions = [...bySession.values()].map((rows) => {
    const date = rows[0].date
    const bodyweight = needsBodyweight ? recentBodyweight(weighIns.data ?? [], date) : undefined
    return { date, rows: sortSetRows(rows), best: bestE1rm(rows, exercise, bodyweight) }
  })
  const chart = sessions.flatMap((s) =>
    s.best === undefined ? [] : [{ date: s.date, e1rm: s.best }],
  )
  const best = chart.reduce<number | undefined>(
    (max, point) => (max === undefined || point.e1rm > max ? point.e1rm : max),
    undefined,
  )
  const shortDate = (date: string) => formatDate(date, lang, { day: 'numeric', month: 'short' })

  return (
    <div className="space-y-4">
      <div>
        <button type="button" onClick={() => navigate(-1)} className="min-h-11 text-sm text-accent">
          ‹ {t('common.back')}
        </button>
        <h1 className="text-xl font-semibold">{exercise.name}</h1>
        <p className="text-sm text-muted">
          {t(`equip.${exercise.equipment}`)}
          {exercise.primaryMuscles.length > 0 &&
            ` · ${exercise.primaryMuscles.map((muscle) => t(`muscle.${muscle}`)).join(', ')}`}
        </p>
      </div>

      {sessions.length === 0 ? (
        <Message title={t('ex.historyEmpty')} />
      ) : (
        <>
          <Card>
            <p className="text-sm text-muted">{t('ex.bestE1rm')}</p>
            <p className="text-2xl font-semibold">
              {best === undefined ? '–' : `${formatNumber(best, lang, 1)} kg`}
            </p>
            {chart.length > 1 ? (
              <div className="mt-3 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chart} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={shortDate}
                      tick={{ fill: 'var(--muted)', fontSize: 11 }}
                      stroke="var(--border)"
                      minTickGap={24}
                    />
                    <YAxis
                      domain={['auto', 'auto']}
                      tick={{ fill: 'var(--muted)', fontSize: 11 }}
                      stroke="var(--border)"
                      tickFormatter={(value: number) => formatNumber(value, lang, 0)}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        color: 'var(--text)',
                      }}
                      labelFormatter={(label) => shortDate(String(label))}
                      formatter={(value) => [`${formatNumber(Number(value), lang, 1)} kg`, 'e1RM']}
                    />
                    <Line
                      type="monotone"
                      dataKey="e1rm"
                      stroke="var(--accent)"
                      strokeWidth={2}
                      dot={{ r: 3, fill: 'var(--accent)' }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="mt-1 text-xs text-muted">{t('ex.e1rmHint')}</p>
            )}
          </Card>

          <ul>
            {[...sessions].reverse().map((session) => (
              <li key={session.rows[0].session_id} className="border-b border-border py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">
                    {formatDate(session.date, lang, {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                  {session.best !== undefined && (
                    <span className="shrink-0 text-xs text-muted">
                      e1RM {formatNumber(session.best, lang, 1)}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {session.rows.map((row) => setText(row, lang, display, t)).join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
