import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card } from '../components/ui'
import { useLang, useT } from '../i18n'
import { formatDate, today, weekday } from '../lib/date'
import { CopyModeSheet } from './CopyModeSheet'
import { newDraft } from './draft'
import { discardDraft, startDraft, useDraft } from './draftStore'
import type { TemplateRow } from './types'
import { startFromTemplate, useTemplates } from './useTemplates'

/**
 * The one place a workout is started or picked up again, shown on Bugün and Antrenman.
 * With a workout in progress it offers to continue or delete it; otherwise it asks
 * which saved workout to do and never picks one for the user.
 */
export function WorkoutStarter({ userId, title }: { userId: string; title: string }) {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const draft = useDraft(userId)
  const templates = useTemplates(userId).data ?? []
  const [starting, setStarting] = useState<TemplateRow | null>(null)

  if (draft) {
    const sets = draft.exercises.flatMap((exercise) => exercise.sets)
    const done = sets.filter((set) => set.done).length
    return (
      <Card>
        <p className="text-sm text-muted">
          {t(draft.editing ? 'workout.editTitle' : 'workout.inProgress')}
        </p>
        <p className="mt-0.5 truncate text-lg font-semibold">
          {draft.name || t('workout.unnamed')}
        </p>
        <p className="text-sm text-muted">
          {formatDate(draft.date, lang)} · {t('workout.setsDone', { done, total: sets.length })}
        </p>
        <div className="mt-3 flex gap-2">
          <Button className="flex-1" onClick={() => navigate('/workout/active')}>
            {t('workout.resume')}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              // An edit of a saved session is only dropped; a new workout is deleted.
              if (draft.editing || window.confirm(t('workout.discardConfirm'))) {
                discardDraft(userId)
              }
            }}
          >
            {t(draft.editing ? 'workout.cancelEdit' : 'workout.delete')}
          </Button>
        </div>
      </Card>
    )
  }

  // Every saved workout is offered; the ones the user put on this weekday come first.
  const onToday = (template: TemplateRow) => (template.weekdays.includes(weekday(today())) ? 0 : 1)
  const choices = [...templates].sort((a, b) => onToday(a) - onToday(b))

  return (
    <Card>
      <h2 className="mb-1 font-medium">{title}</h2>
      {choices.length === 0 ? (
        <p className="py-1 text-sm text-muted">{t('today.noSaved')}</p>
      ) : (
        <ul>
          {choices.map((template) => (
            <li key={template.id} className="border-t border-border first:border-t-0">
              <button
                type="button"
                onClick={() => setStarting(template)}
                className="flex min-h-14 w-full items-center justify-between gap-3 text-left"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{template.name}</span>
                  <span className="block text-xs text-muted">
                    {t('workout.exercisesCount', { n: template.items.length })}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-medium text-accent">{t('tpl.start')} ›</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex items-center gap-2 border-t border-border pt-3">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => {
            startDraft(userId, newDraft(today()))
            navigate('/workout/active')
          }}
        >
          + {t('workout.startEmpty')}
        </Button>
        <Link
          to="/workout/templates"
          className="flex min-h-11 shrink-0 items-center px-2 text-sm text-accent"
        >
          {t('tpl.manage')} ›
        </Link>
      </div>

      {starting && (
        <CopyModeSheet
          onClose={() => setStarting(null)}
          onChoose={async (mode) => {
            await startFromTemplate(userId, starting, mode)
            navigate('/workout/active')
          }}
        />
      )}
    </Card>
  )
}
