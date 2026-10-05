import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { isNetworkError } from '../api/errors'
import { useAuth } from '../auth/AuthContext'
import { Button, ErrorNote, Field, Message, TextInput } from '../components/ui'
import { useT } from '../i18n'
import { today } from '../lib/date'
import { ExerciseList } from '../workout/ExerciseList'
import { draftFromItems, itemsFromDraft } from '../workout/templates'
import type { Draft, TemplateRow } from '../workout/types'
import { useSaveTemplate, useTemplates } from '../workout/useTemplates'
import { WeekdayPicker } from '../workout/WeekdayPicker'

/** Route wrapper: waits for the saved workouts, then mounts the editor with its start values. */
export function TemplateEditPage() {
  const { id = 'new' } = useParams()
  const t = useT()
  const { user } = useAuth()
  const templates = useTemplates(user?.id)

  if (id === 'new') return <Editor key="new" userId={user!.id} />
  if (templates.isPending) return <p className="py-6 text-sm text-muted">{t('app.loading')}</p>

  const template = templates.data?.find((item) => item.id === id)
  if (!template) {
    return (
      <Message
        title={t(
          templates.isError && isNetworkError(templates.error)
            ? 'app.serverUnreachable'
            : 'tpl.notFound',
        )}
        action={
          <Link to="/workout/templates" className="flex min-h-11 items-center text-accent">
            {t('common.back')}
          </Link>
        }
      />
    )
  }
  return <Editor key={template.id} userId={user!.id} template={template} />
}

function Editor({ userId, template }: { userId: string; template?: TemplateRow }) {
  const t = useT()
  const navigate = useNavigate()
  const save = useSaveTemplate(userId)
  const [name, setName] = useState(template?.name ?? '')
  const [note, setNote] = useState(template?.note ?? '')
  const [weekdays, setWeekdays] = useState(template?.weekdays ?? [])
  const [nameMissing, setNameMissing] = useState(false)
  // The same editor as a live session, on a scratch draft that never leaves this page.
  const [draft, setDraft] = useState<Draft>(() =>
    draftFromItems(template?.items ?? [], 'values', { date: today(), name: '', templateId: null }),
  )
  const apply = useCallback((fn: (draft: Draft) => Draft) => setDraft(fn), [])

  function submit() {
    if (!name.trim()) return setNameMissing(true)
    save.mutate(
      {
        id: template?.id ?? crypto.randomUUID(),
        user_id: userId,
        name: name.trim(),
        note: note.trim() || null,
        weekdays,
        items: itemsFromDraft(draft),
      },
      { onSuccess: () => navigate('/workout/templates', { replace: true }) },
    )
  }

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">{t(template ? 'tpl.editTitle' : 'tpl.newTitle')}</h1>

      <Field label={t('tpl.name')} error={nameMissing ? t('tpl.nameRequired') : undefined}>
        <TextInput
          value={name}
          maxLength={80}
          placeholder={t('tpl.namePlaceholder')}
          onChange={(e) => {
            setName(e.target.value)
            setNameMissing(false)
          }}
        />
      </Field>
      <Field label={t('ex.note')} optional={t('common.optional')}>
        <TextInput value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div>
        <p className="mb-1.5 text-sm text-muted">{t('tpl.weekdays')}</p>
        <WeekdayPicker label={t('tpl.weekdays')} value={weekdays} onChange={setWeekdays} />
      </div>

      <ExerciseList draft={draft} apply={apply} planning />

      {save.isError && (
        <ErrorNote>
          {t(isNetworkError(save.error) ? 'app.serverUnreachable' : 'common.error')}
        </ErrorNote>
      )}
      <div className="space-y-2 pt-3">
        <Button block disabled={save.isPending} onClick={submit}>
          {save.isPending ? t('common.saving') : t('common.save')}
        </Button>
        <Button variant="ghost" block onClick={() => navigate('/workout/templates')}>
          {t('common.cancel')}
        </Button>
      </div>
    </div>
  )
}
