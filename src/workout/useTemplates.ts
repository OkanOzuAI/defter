import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteTemplate, listTemplates, saveTemplate } from '../api/templates'
import { getSession, getTemplateSessions } from '../api/workouts'
import { today } from '../lib/date'
import { withDeviceCache } from '../lib/deviceCache'
import { startDraft } from './draftStore'
import { draftFromItems, itemsFromSession, withLastValues } from './templates'
import type { CopyMode, SessionRow, SetRow, TemplateRow } from './types'

export const templatesKey = (userId: string | undefined) => ['templates', userId] as const

/** Saved workouts. Also readable offline: you may be starting one in a basement gym. */
export function useTemplates(userId: string | undefined) {
  return useQuery({
    queryKey: templatesKey(userId),
    queryFn: () => withDeviceCache(userId!, 'templates', listTemplates),
    enabled: Boolean(userId),
    networkMode: 'always',
    staleTime: 60_000,
  })
}

export function useSaveTemplate(userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: saveTemplate,
    onSuccess: (saved) => {
      queryClient.setQueryData<TemplateRow[]>(templatesKey(userId), (list = []) =>
        [...list.filter((t) => t.id !== saved.id), saved].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      )
      void queryClient.invalidateQueries({ queryKey: templatesKey(userId) })
    },
  })
}

export function useDeleteTemplate(userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteTemplate,
    onSuccess: (_, id) => {
      queryClient.setQueryData<TemplateRow[]>(templatesKey(userId), (list = []) =>
        list.filter((t) => t.id !== id),
      )
    },
  })
}

/**
 * Starts a session from a saved workout, prefilled from the most recent session done
 * from it. Without a connection (or a previous session) the template's own values are used.
 */
export async function startFromTemplate(userId: string, template: TemplateRow, mode: CopyMode) {
  let items = template.items
  try {
    const [last] = await getTemplateSessions(template.id, 1)
    const previous = last && (await getSession(last.id))
    if (previous) items = withLastValues(template.items, previous.sets)
  } catch {
    // offline: fall back to what the template has stored
  }
  startDraft(
    userId,
    draftFromItems(items, mode, { date: today(), name: template.name, templateId: template.id }),
  )
}

/** Starts a new session as a copy of a past one. */
export function startFromSession(
  userId: string,
  session: SessionRow,
  sets: SetRow[],
  mode: CopyMode,
) {
  startDraft(
    userId,
    draftFromItems(itemsFromSession(session, sets), mode, {
      date: today(),
      name: session.name ?? '',
      templateId: session.template_id,
    }),
  )
}
