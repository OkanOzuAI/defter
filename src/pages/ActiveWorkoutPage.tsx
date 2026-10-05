import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/ui'
import { useT } from '../i18n'
import { isDateStr } from '../lib/date'
import { toSessionRow, toSetRows } from '../workout/draft'
import { discardDraft, finishDraft, updateDraft, useDraft } from '../workout/draftStore'
import { ExerciseList } from '../workout/ExerciseList'
import { useBodyweight, useLastSets, useNow, useWakeLock, workoutKey } from '../workout/hooks'
import { RestTimerBar } from '../workout/RestTimerBar'
import { SyncBadge } from '../workout/SyncBadge'
import { swapInTemplate } from '../workout/templates'
import type { Draft, RestState } from '../workout/types'
import { useSaveTemplate, useTemplates } from '../workout/useTemplates'

export function ActiveWorkoutPage() {
  const t = useT()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userId = user?.id
  const draft = useDraft(userId)
  const templates = useTemplates(userId)
  const saveTemplate = useSaveTemplate(userId)
  // Where to go once the draft is gone; set in the same tick as finishing or discarding it.
  const [exitTo, setExitTo] = useState<string | null>(null)

  const now = useNow(draft && !draft.editing ? 15_000 : null)
  useWakeLock(Boolean(draft && !draft.editing))

  const lastSets = useLastSets(
    userId,
    draft?.exercises.map((e) => e.exercise_id) ?? [],
    draft?.id ?? '',
    draft?.date ?? '',
  )
  const bodyweight = useBodyweight(draft ? userId : undefined, draft?.date ?? '')

  const apply = useCallback(
    (fn: (draft: Draft) => Draft) => {
      if (userId) updateDraft(userId, fn)
    },
    [userId],
  )
  const setRest = useCallback((rest: RestState | null) => apply((d) => ({ ...d, rest })), [apply])

  if (exitTo) return <Navigate to={exitTo} replace />
  if (!userId || !draft) return <Navigate to="/workout" replace />

  const minutes = Math.max(0, Math.floor((now - Date.parse(draft.started_at)) / 60_000))
  const template = templates.data?.find((item) => item.id === draft.template_id)

  function finish() {
    const finished = finishDraft(userId!)
    if (!finished) return
    // Show the saved session straight away, even before (or without) the server round trip.
    queryClient.setQueryData([...workoutKey(userId), 'session', finished.id], {
      session: toSessionRow(finished, userId!),
      sets: toSetRows(finished, userId!),
    })
    setExitTo(`/workout/session/${finished.id}`)
  }

  function discard() {
    if (!draft!.editing && !window.confirm(t('workout.discardConfirm'))) return
    const sessionId = draft!.id
    const wasEditing = draft!.editing
    discardDraft(userId!)
    setExitTo(wasEditing ? `/workout/session/${sessionId}` : '/workout')
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <input
          aria-label={t('workout.namePlaceholder')}
          placeholder={draft.editing ? t('workout.editTitle') : t('workout.namePlaceholder')}
          value={draft.name}
          onChange={(e) => apply((d) => ({ ...d, name: e.target.value }))}
          maxLength={80}
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent text-xl font-semibold placeholder:text-muted/60 focus:border-border focus:bg-surface-2 focus:px-2 focus:outline-none"
        />
        {draft.editing ? (
          <input
            type="date"
            aria-label={t('workout.date')}
            value={draft.date}
            onChange={(e) => {
              const date = e.target.value
              if (isDateStr(date)) apply((d) => ({ ...d, date }))
            }}
            className="min-h-11 shrink-0 rounded-lg border border-border bg-surface-2 px-2 text-sm"
          />
        ) : (
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            <span className="text-sm text-muted">{t('workout.minutes', { n: minutes })}</span>
            <SyncBadge />
          </div>
        )}
      </div>

      <ExerciseList
        draft={draft}
        apply={apply}
        lastSets={lastSets}
        bodyweight={bodyweight}
        onSwapInTemplate={
          template && !draft.editing
            ? (index, exerciseId, unilateral) =>
                saveTemplate.mutate(
                  {
                    ...template,
                    items: swapInTemplate(template.items, index, exerciseId, unilateral),
                  },
                  { onError: () => window.alert(t('common.error')) },
                )
            : undefined
        }
      />

      <div className="space-y-2 pt-3">
        <Button block onClick={finish}>
          {draft.editing ? t('workout.saveEdit') : t('workout.finish')}
        </Button>
        <Button variant="ghost" block onClick={discard}>
          {draft.editing ? t('workout.cancelEdit') : t('workout.discard')}
        </Button>
      </div>

      {draft.rest && <RestTimerBar rest={draft.rest} onChange={setRest} />}
    </div>
  )
}
