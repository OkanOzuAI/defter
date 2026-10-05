import { useQuery } from '@tanstack/react-query'
import { getExerciseHistory, getSession, getTemplateSessions } from '../api/workouts'
import { Card } from '../components/ui'
import { useLang, useT } from '../i18n'
import { volumeLoad } from '../lib/calc'
import { formatNumber } from '../lib/number'
import { resolveExercise } from './exercises'
import { useBodyweight, workoutKey } from './hooks'
import { findPRs, type PR } from './templates'
import type { SessionRow, SetRow } from './types'

const workingSets = (sets: SetRow[]) =>
  sets.filter((row) => row.done && row.set_type !== 'warmup').length

const minutesOf = (session: SessionRow) =>
  session.started_at && session.ended_at
    ? Math.round((Date.parse(session.ended_at) - Date.parse(session.started_at)) / 60_000)
    : null

/** Duration, working sets, volume, records, and a comparison with the previous run of the same saved workout. */
export function SessionSummary({
  userId,
  session,
  sets,
}: {
  userId: string
  session: SessionRow
  sets: SetRow[]
}) {
  const t = useT()
  const lang = useLang()
  const bodyweight = useBodyweight(userId, session.date)
  const done = sets.filter((row) => row.done)
  const exerciseIds = [...new Set(done.map((row) => row.exercise_id))].sort()

  const history = useQuery({
    queryKey: [...workoutKey(userId), 'history', session.id, exerciseIds.join(',')],
    queryFn: () => getExerciseHistory(exerciseIds, session.date),
    enabled: exerciseIds.length > 0,
  })

  const previous = useQuery({
    queryKey: [...workoutKey(userId), 'previous', session.id, session.template_id],
    enabled: Boolean(session.template_id),
    queryFn: async () => {
      const recent = await getTemplateSessions(session.template_id!, 10)
      // The newest finished session of this template that came before this one.
      const before = recent.find(
        (other) =>
          other.id !== session.id &&
          (other.date < session.date ||
            (other.date === session.date && (other.started_at ?? '') < (session.started_at ?? ''))),
      )
      return before ? getSession(before.id) : null
    },
  })

  const prs: PR[] = history.data
    ? findPRs(
        done,
        history.data.filter((row) => row.session_id !== session.id),
        resolveExercise,
        bodyweight,
      )
    : []

  const minutes = minutesOf(session)
  const volume = volumeLoad(done)
  const number = (value: number, digits = 0) => formatNumber(value, lang, digits)
  const signed = (value: number, digits = 0) =>
    `${value > 0 ? '+' : value < 0 ? '−' : ''}${number(Math.abs(value), digits)}`

  const stat = (label: string, value: string, delta?: string) => (
    <div className="min-w-0 flex-1">
      <p className="truncate text-xs text-muted">{label}</p>
      <p className="text-lg font-semibold leading-tight">{value}</p>
      {delta && <p className="text-xs text-muted">{delta}</p>}
    </div>
  )

  const last = previous.data
  const lastDone = last?.sets.filter((row) => row.done) ?? []
  const lastMinutes = last ? minutesOf(last.session) : null

  return (
    <Card>
      <h2 className="mb-3 text-sm text-muted">{t('sum.title')}</h2>
      <div className="flex gap-3">
        {stat(
          t('workout.duration'),
          minutes === null ? '–' : t('workout.minutes', { n: minutes }),
          last && minutes !== null && lastMinutes !== null
            ? signed(minutes - lastMinutes)
            : undefined,
        )}
        {stat(
          t('sum.workingSets'),
          String(workingSets(done)),
          last ? signed(workingSets(done) - workingSets(lastDone)) : undefined,
        )}
        {stat(
          t('sum.volume'),
          `${number(volume)} kg`,
          last ? `${signed(volume - volumeLoad(lastDone))} kg` : undefined,
        )}
      </div>
      {session.template_id && previous.isSuccess && (
        <p className="mt-2 text-xs text-muted">{t(last ? 'sum.vsLast' : 'sum.vsLastNone')}</p>
      )}

      <h3 className="mb-1 mt-4 text-sm text-muted">{t('sum.prs')}</h3>
      {history.isPending && exerciseIds.length > 0 ? (
        <p className="text-sm text-muted">{t('app.loading')}</p>
      ) : prs.length === 0 ? (
        <p className="text-sm text-muted">{t('sum.noPrs')}</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {prs.map((pr, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span className="min-w-0 truncate">{resolveExercise(pr.exercise_id).name}</span>
              <span className="shrink-0 font-medium text-accent">
                {t(`sum.pr.${pr.kind}`, {
                  value: number(pr.value, pr.kind === 'reps' ? 0 : 1),
                  weight: pr.kind === 'reps' ? number(pr.weight, 2) : '',
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
