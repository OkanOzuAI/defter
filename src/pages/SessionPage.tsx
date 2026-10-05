import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { isNetworkError } from '../api/errors'
import { getSession } from '../api/workouts'
import { useAuth } from '../auth/AuthContext'
import { useProfile } from '../auth/useProfile'
import { Button, Card, Message, TextInput } from '../components/ui'
import { useLang, useT } from '../i18n'
import { formatDate } from '../lib/date'
import { CopyModeSheet } from '../workout/CopyModeSheet'
import { draftFromSession } from '../workout/draft'
import { startDraft, useDraft } from '../workout/draftStore'
import { useExercises } from '../workout/exercises'
import { setText, sortSetRows } from '../workout/history'
import { workoutKey } from '../workout/hooks'
import { enqueue, flush, usePendingCount } from '../workout/outbox'
import { SessionSummary } from '../workout/SessionSummary'
import { itemsFromSession } from '../workout/templates'
import type { SetRow } from '../workout/types'
import { startFromSession, useSaveTemplate, useTemplates } from '../workout/useTemplates'

export function SessionPage() {
  const { id = '' } = useParams()
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user?.id
  const { data: profile } = useProfile()
  const draft = useDraft(userId)
  const pending = usePendingCount()
  const resolveExercise = useExercises().get
  const templates = useTemplates(userId)
  const saveTemplate = useSaveTemplate(userId)
  const [copying, setCopying] = useState(false)
  const [templateName, setTemplateName] = useState<string | null>(null)
  const [savedNote, setSavedNote] = useState(false)

  const queryClient = useQueryClient()
  const queryKey = [...workoutKey(userId), 'session', id]
  const query = useQuery({
    queryKey,
    queryFn: () => getSession(id),
    enabled: Boolean(userId && id),
  })

  if (query.isPending) return <p className="py-6 text-sm text-muted">{t('app.loading')}</p>
  if (query.isError) {
    return (
      <Message
        title={t(isNetworkError(query.error) ? 'app.serverUnreachable' : 'common.error')}
        body={t('app.serverUnreachableHint')}
        action={<Button onClick={() => query.refetch()}>{t('app.retry')}</Button>}
      />
    )
  }
  if (!query.data) {
    return (
      <Message
        title={t('workout.notFound')}
        body={pending > 0 ? t('workout.notSyncedYet') : undefined}
        action={
          <Link to="/workout" className="flex min-h-11 items-center text-accent">
            {t('common.back')}
          </Link>
        }
      />
    )
  }

  const { session, sets } = query.data
  const display = profile?.intensity_display ?? 'rir'
  const done = sortSetRows(sets.filter((row) => row.done))

  // Group by position in the session, in the order the exercises were done.
  const groups = new Map<number, SetRow[]>()
  for (const row of done) {
    groups.set(row.exercise_position, [...(groups.get(row.exercise_position) ?? []), row])
  }

  const template = templates.data?.find((item) => item.id === session.template_id)
  const items = itemsFromSession(session, sets)

  function saveAsTemplate() {
    const name = (templateName ?? '').trim()
    if (!userId || !name) return
    saveTemplate.mutate(
      { id: crypto.randomUUID(), user_id: userId, name, note: null, weekdays: [], items },
      {
        onSuccess: (saved) => {
          setTemplateName(null)
          setSavedNote(true)
          // This session becomes the first run of the new saved workout, so the next
          // start is prefilled from it and later runs are compared with it.
          const linked = { ...session, template_id: saved.id }
          queryClient.setQueryData(queryKey, { session: linked, sets })
          enqueue(userId, { session: linked })
          void flush(userId)
        },
      },
    )
  }

  function updateTemplate() {
    if (!template || !window.confirm(t('tpl.updateConfirm', { name: template.name }))) return
    saveTemplate.mutate({ ...template, items }, { onSuccess: () => setSavedNote(true) })
  }

  function edit() {
    if (!userId) return
    startDraft(userId, draftFromSession(session, sets))
    navigate('/workout/active')
  }

  function remove() {
    if (!userId || !window.confirm(t('workout.deleteConfirm'))) return
    enqueue(userId, { deleteSession: session.id })
    void flush(userId)
    navigate('/workout', { replace: true })
  }

  return (
    <div className="space-y-4">
      <div>
        <Link to="/workout" className="flex min-h-11 items-center text-sm text-accent">
          ‹ {t('workout.history')}
        </Link>
        <h1 className="text-xl font-semibold">{session.name || t('workout.unnamed')}</h1>
        <p className="text-sm text-muted">
          {formatDate(session.date, lang, {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            weekday: 'long',
          })}
          {!session.ended_at && ` · ${t('workout.unfinished')}`}
        </p>
      </div>

      {userId && <SessionSummary userId={userId} session={session} sets={sets} />}

      {groups.size === 0 && <p className="py-4 text-sm text-muted">{t('workout.noSets')}</p>}

      {[...groups.entries()].map(([position, rows]) => {
        const exercise = resolveExercise(rows[0].exercise_id)
        const info = session.exercises.find((e) => e.position === position)
        return (
          <Card key={position}>
            <Link to={`/workout/exercise/${exercise.id}`} className="font-semibold">
              {rows[0].superset_group && (
                <span className="mr-1.5 text-accent">{rows[0].superset_group}</span>
              )}
              {exercise.name}
            </Link>
            {info?.tempo && <p className="mt-1 text-sm text-muted">Tempo {info.tempo}</p>}
            {info?.note && <p className="mt-1 text-sm text-muted">{info.note}</p>}
            <ul className="mt-2">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="flex min-h-9 items-center gap-3 border-t border-border py-1.5"
                >
                  <span className="w-7 shrink-0 text-xs text-muted">
                    {t(`settype.short.${row.set_type}`)}
                  </span>
                  <span className="flex-1">{setText(row, lang, display, t)}</span>
                  {row.techniques.length > 0 && (
                    <span className="text-right text-xs text-muted">
                      {row.techniques
                        .map((technique) => t(`tech.${technique}` as 'tech.rest_pause'))
                        .join(', ')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )
      })}

      {session.note && <p className="text-sm text-muted">{session.note}</p>}

      <div className="space-y-2 pt-2">
        {templateName === null ? (
          <Button
            block
            disabled={items.length === 0}
            onClick={() => setTemplateName(session.name ?? '')}
          >
            {t('tpl.saveAs')}
          </Button>
        ) : (
          <Card>
            <label className="block">
              <span className="mb-1.5 block text-sm text-muted">{t('tpl.name')}</span>
              <TextInput
                autoFocus
                value={templateName}
                maxLength={80}
                placeholder={t('tpl.namePlaceholder')}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </label>
            <div className="mt-3 flex gap-2">
              <Button
                className="flex-1"
                disabled={!templateName.trim() || saveTemplate.isPending}
                onClick={saveAsTemplate}
              >
                {saveTemplate.isPending ? t('common.saving') : t('common.save')}
              </Button>
              <Button variant="ghost" onClick={() => setTemplateName(null)}>
                {t('common.cancel')}
              </Button>
            </div>
          </Card>
        )}
        {template && (
          <Button
            variant="secondary"
            block
            disabled={saveTemplate.isPending || items.length === 0}
            onClick={updateTemplate}
          >
            {t('tpl.update')}
          </Button>
        )}
        {savedNote && !saveTemplate.isPending && (
          <p role="status" className="text-center text-sm text-accent">
            {t('tpl.saved')}
          </p>
        )}
        {saveTemplate.isError && (
          <p role="alert" className="text-center text-sm text-danger">
            {t(isNetworkError(saveTemplate.error) ? 'app.serverUnreachable' : 'common.error')}
          </p>
        )}

        <Button
          variant="secondary"
          block
          disabled={Boolean(draft) || items.length === 0}
          onClick={() => setCopying(true)}
        >
          {t('copy.action')}
        </Button>
        <Button variant="secondary" block disabled={Boolean(draft)} onClick={edit}>
          {t('workout.edit')}
        </Button>
        {draft && <p className="text-center text-xs text-muted">{t('workout.editBlocked')}</p>}
        <Button variant="danger" block onClick={remove}>
          {t('workout.delete')}
        </Button>
      </div>

      {copying && userId && (
        <CopyModeSheet
          onClose={() => setCopying(false)}
          onChoose={(mode) => {
            startFromSession(userId, session, sets, mode)
            navigate('/workout/active')
          }}
        />
      )}
    </div>
  )
}
