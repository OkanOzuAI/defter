import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isNetworkError } from '../api/errors'
import { useAuth } from '../auth/AuthContext'
import { Button, Card, Message } from '../components/ui'
import { useT } from '../i18n'
import { CopyModeSheet } from '../workout/CopyModeSheet'
import { useDraft } from '../workout/draftStore'
import type { TemplateRow } from '../workout/types'
import {
  startFromTemplate,
  useDeleteTemplate,
  useSaveTemplate,
  useTemplates,
} from '../workout/useTemplates'
import { WeekdayPicker } from '../workout/WeekdayPicker'

const action = 'min-h-11 rounded-lg border border-border px-3 text-sm'

export function TemplatesPage() {
  const t = useT()
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user?.id
  const draft = useDraft(userId)
  const templates = useTemplates(userId)
  const save = useSaveTemplate(userId)
  const remove = useDeleteTemplate(userId)
  const [starting, setStarting] = useState<TemplateRow | null>(null)

  const failed = save.isError || remove.isError

  return (
    <div className="space-y-4">
      <div>
        <Link to="/workout" className="flex min-h-11 items-center text-sm text-accent">
          ‹ {t('nav.workout')}
        </Link>
        <h1 className="text-xl font-semibold">{t('tpl.title')}</h1>
      </div>

      {draft && <p className="text-sm text-muted">{t('copy.blocked')}</p>}
      {failed && <p className="text-sm text-danger">{t('common.error')}</p>}

      {templates.isPending ? (
        <p className="py-6 text-sm text-muted">{t('app.loading')}</p>
      ) : templates.isError ? (
        <Message
          title={t(isNetworkError(templates.error) ? 'app.serverUnreachable' : 'common.error')}
          body={t('app.serverUnreachableHint')}
          action={<Button onClick={() => templates.refetch()}>{t('app.retry')}</Button>}
        />
      ) : templates.data.length === 0 ? (
        <Message title={t('tpl.empty')} />
      ) : (
        templates.data.map((template) => (
          <Card key={template.id}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="min-w-0 truncate font-semibold">{template.name}</h2>
              <span className="shrink-0 text-sm text-muted">
                {t('workout.exercisesCount', { n: template.items.length })}
              </span>
            </div>
            {template.note && <p className="mt-1 text-sm text-muted">{template.note}</p>}

            <p className="mb-1.5 mt-3 text-xs text-muted">{t('tpl.weekdays')}</p>
            <WeekdayPicker
              label={t('tpl.weekdays')}
              value={template.weekdays}
              onChange={(weekdays) => save.mutate({ ...template, weekdays })}
            />

            <div className="mt-3 flex flex-wrap gap-2">
              <Button disabled={Boolean(draft)} onClick={() => setStarting(template)}>
                {t('tpl.start')}
              </Button>
              <Link
                to={`/workout/templates/${template.id}`}
                className={`${action} flex items-center`}
              >
                {t('tpl.edit')}
              </Link>
              <button
                type="button"
                className={action}
                onClick={() =>
                  save.mutate({
                    ...template,
                    id: crypto.randomUUID(),
                    name: `${template.name} (${t('tpl.copySuffix')})`.slice(0, 80),
                    weekdays: [],
                  })
                }
              >
                {t('tpl.duplicate')}
              </button>
              <button
                type="button"
                className={`${action} border-danger text-danger`}
                onClick={() => {
                  if (window.confirm(t('tpl.deleteConfirm', { name: template.name }))) {
                    remove.mutate(template.id)
                  }
                }}
              >
                {t('tpl.delete')}
              </button>
            </div>
          </Card>
        ))
      )}

      <Button variant="secondary" block onClick={() => navigate('/workout/templates/new')}>
        + {t('tpl.new')}
      </Button>

      {starting && userId && (
        <CopyModeSheet
          onClose={() => setStarting(null)}
          onChoose={async (mode) => {
            await startFromTemplate(userId, starting, mode)
            navigate('/workout/active')
          }}
        />
      )}
    </div>
  )
}
