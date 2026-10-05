import { useState } from 'react'
import { Button, Card } from '../components/ui'
import { SUGGESTED_WORKOUTS, targetNote, toTemplate } from '../data/suggestedWorkouts'
import { useLang, useT } from '../i18n'
import { useExercises } from './exercises'
import type { TemplateRow } from './types'
import { useSaveTemplate } from './useTemplates'

type Props = { userId: string; existing: TemplateRow[] }

/** Ready-made workouts that can be copied into the user's own saved workouts. Opt-in only. */
export function SuggestedWorkouts({ userId, existing }: Props) {
  const t = useT()
  const lang = useLang()
  const { get } = useExercises()
  const save = useSaveTemplate(userId)
  const [open, setOpen] = useState<string | null>(null)

  // Matched by name in either language, so switching language does not offer it again.
  const names = new Set(existing.map((template) => template.name))
  const added = (key: string) => {
    const workout = SUGGESTED_WORKOUTS.find((item) => item.key === key)!
    return names.has(workout.name.tr) || names.has(workout.name.en)
  }
  const missing = SUGGESTED_WORKOUTS.filter((workout) => !added(workout.key))

  async function addAll() {
    for (const workout of missing) await save.mutateAsync(toTemplate(workout, lang, userId))
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium">{t('sug.title')}</h2>
        {missing.length > 1 && (
          <button
            type="button"
            disabled={save.isPending}
            onClick={() => void addAll()}
            className="min-h-11 shrink-0 text-sm text-accent disabled:opacity-50"
          >
            {t('sug.addAll')}
          </button>
        )}
      </div>
      <p className="text-xs text-muted">{t('sug.hint')}</p>

      <ul className="mt-2">
        {SUGGESTED_WORKOUTS.map((workout) => (
          <li key={workout.key} className="border-t border-border py-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-expanded={open === workout.key}
                onClick={() => setOpen(open === workout.key ? null : workout.key)}
                className="min-h-11 min-w-0 flex-1 text-left"
              >
                <span className="block truncate font-medium">{workout.name[lang]}</span>
                <span className="block text-sm text-muted">
                  {t('workout.exercisesCount', { n: workout.lines.length })}
                </span>
              </button>
              {added(workout.key) ? (
                <span className="shrink-0 px-2 text-sm text-muted">{t('sug.added')}</span>
              ) : (
                <Button
                  className="shrink-0"
                  disabled={save.isPending}
                  onClick={() => save.mutate(toTemplate(workout, lang, userId))}
                >
                  {t('sug.add')}
                </Button>
              )}
            </div>
            {open === workout.key && (
              <ol className="mb-1 mt-1 space-y-1 text-sm">
                {workout.lines.map((item, index) => (
                  <li key={index} className="flex justify-between gap-3">
                    <span className="min-w-0">
                      {item.superset && <span className="mr-1 text-accent">{item.superset}</span>}
                      {get(item.exercise).name}
                    </span>
                    <span className="shrink-0 text-right text-muted">
                      {item.sets} × {targetNote(item, lang)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}
