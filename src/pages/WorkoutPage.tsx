import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { isNetworkError } from '../api/errors'
import { listSessions } from '../api/workouts'
import { useAuth } from '../auth/AuthContext'
import { Button, Message } from '../components/ui'
import { useLang, useT } from '../i18n'
import { formatDate } from '../lib/date'
import { useDraft } from '../workout/draftStore'
import { workoutKey } from '../workout/hooks'
import { WorkoutStarter } from '../workout/WorkoutStarter'

export function WorkoutPage() {
  const t = useT()
  const lang = useLang()
  const { user } = useAuth()
  const userId = user?.id
  const draft = useDraft(userId)

  const sessions = useQuery({
    queryKey: [...workoutKey(userId), 'sessions'],
    queryFn: () => listSessions(),
    enabled: Boolean(userId),
  })

  // The session still being logged lives in the draft, not in the history list.
  const history = (sessions.data ?? []).filter((s) => s.id !== draft?.id || draft.editing)

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">{t('nav.workout')}</h1>

      {userId && <WorkoutStarter userId={userId} title={t('today.choose')} />}
      {draft && (
        <Link to="/workout/templates" className="flex min-h-11 items-center text-sm text-accent">
          {t('tpl.title')} ›
        </Link>
      )}

      <section>
        <h2 className="mb-1 font-medium">{t('workout.history')}</h2>
        {sessions.isPending ? (
          <p className="py-6 text-sm text-muted">{t('app.loading')}</p>
        ) : sessions.isError ? (
          <Message
            title={t(isNetworkError(sessions.error) ? 'app.serverUnreachable' : 'common.error')}
            body={t('app.serverUnreachableHint')}
            action={<Button onClick={() => sessions.refetch()}>{t('app.retry')}</Button>}
          />
        ) : history.length === 0 ? (
          <p className="py-6 text-sm text-muted">{t('workout.historyEmpty')}</p>
        ) : (
          <ul>
            {history.map((session) => (
              <li key={session.id}>
                <Link
                  to={`/workout/session/${session.id}`}
                  className="flex min-h-14 items-center justify-between gap-3 border-b border-border py-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {session.name || t('workout.unnamed')}
                    </span>
                    <span className="block text-sm text-muted">
                      {formatDate(session.date, lang)}
                      {!session.ended_at && ` · ${t('workout.unfinished')}`}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm text-muted">
                    {t('workout.exercisesCount', { n: session.exercises.length })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
