import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { isNetworkError } from '../api/errors'
import { deleteSupplementLog, saveSupplementLog } from '../api/supplements'
import { SUPPLEMENT_TIMINGS, type Supplement, type SupplementLog } from '../api/types'
import { useLang, useT } from '../i18n'
import { nowTime, type DateStr } from '../lib/date'
import { caffeineTotal, doseTotals } from '../lib/diet'
import { formatNumber, parseNumber, toInputValue } from '../lib/number'
import { supplementLogsKey, useSupplementLogs, useSupplements } from './hooks'

type Props = {
  userId: string
  date: DateStr
  /** Show dose and time inputs for what was taken (Beslenme); off for the quick list on Bugün. */
  editable?: boolean
}

const small =
  'min-h-11 min-w-0 rounded-lg border border-border bg-surface-2 px-2 text-center focus:border-accent focus:outline-none'

/** The day's supplements grouped by timing; one tap marks one as taken. */
export function SupplementChecklist({ userId, date, editable }: Props) {
  const t = useT()
  const lang = useLang()
  const queryClient = useQueryClient()
  const supplements = useSupplements(userId)
  const logs = useSupplementLogs(userId, date, date)
  const logsKey = [...supplementLogsKey(userId), date, date]

  // The list updates at once; a failed request puts the previous state back.
  const setLogs = (fn: (logs: SupplementLog[]) => SupplementLog[]) =>
    queryClient.setQueryData<SupplementLog[]>(logsKey, (current = []) => fn(current))
  const rollback = (previous: SupplementLog[] | undefined) =>
    queryClient.setQueryData(logsKey, previous)
  const settle = () => queryClient.invalidateQueries({ queryKey: supplementLogsKey(userId) })

  const save = useMutation({
    mutationFn: saveSupplementLog,
    onMutate: (log) => {
      const previous = queryClient.getQueryData<SupplementLog[]>(logsKey)
      setLogs((current) => [...current.filter((item) => item.id !== log.id), log])
      return previous
    },
    onError: (_error, _log, previous) => rollback(previous),
    onSettled: settle,
  })
  const remove = useMutation({
    mutationFn: deleteSupplementLog,
    onMutate: (id) => {
      const previous = queryClient.getQueryData<SupplementLog[]>(logsKey)
      setLogs((current) => current.filter((item) => item.id !== id))
      return previous
    },
    onError: (_error, _id, previous) => rollback(previous),
    onSettled: settle,
  })

  if (supplements.isPending || logs.isPending) {
    return <p className="py-3 text-sm text-muted">{t('app.loading')}</p>
  }
  if (supplements.isError || logs.isError) {
    return <p className="py-3 text-sm text-muted">{t('app.serverUnreachable')}</p>
  }

  const active = supplements.data.filter((s) => s.active)
  if (active.length === 0) {
    return (
      <p className="py-3 text-sm text-muted">
        {t('sup.empty')}{' '}
        <Link to="/profile/supplements" className="text-accent">
          {t('sup.manage')}
        </Link>
      </p>
    )
  }

  const dayLogs = logs.data
  const totals = doseTotals(dayLogs)
  const caffeine = caffeineTotal(dayLogs, supplements.data)
  const error = save.error ?? remove.error

  const take = (supplement: Supplement) =>
    save.mutate({
      id: crypto.randomUUID(),
      user_id: userId,
      date,
      supplement_id: supplement.id,
      dose: supplement.dose,
      time: nowTime(),
    })

  return (
    <div>
      {SUPPLEMENT_TIMINGS.map((timing) => {
        const group = active.filter((s) => s.timing === timing)
        if (group.length === 0) return null
        return (
          <div key={timing} className="mb-2">
            <p className="py-1 text-xs text-muted">{t(`sup.timing.${timing}`)}</p>
            <ul>
              {group.map((supplement) => {
                const taken = dayLogs.filter((log) => log.supplement_id === supplement.id)
                const first = taken[0]
                const over =
                  supplement.daily_max !== null &&
                  (totals.get(supplement.id) ?? 0) > supplement.daily_max
                return (
                  <li key={supplement.id} className="border-t border-border py-1">
                    <button
                      type="button"
                      aria-pressed={Boolean(first)}
                      aria-label={`${supplement.name}: ${t(first ? 'sup.untake' : 'sup.take')}`}
                      onClick={() => (first ? remove.mutate(first.id) : take(supplement))}
                      className="flex min-h-11 w-full items-center gap-3 text-left"
                    >
                      <span
                        aria-hidden="true"
                        className={
                          'flex size-6 shrink-0 items-center justify-center rounded-md border text-sm ' +
                          (first
                            ? 'border-accent bg-accent text-accent-fg'
                            : 'border-border text-transparent')
                        }
                      >
                        ✓
                      </span>
                      <span className="min-w-0 flex-1 truncate">{supplement.name}</span>
                      <span className="shrink-0 text-sm text-muted">
                        {supplement.dose !== null && formatNumber(supplement.dose, lang, 2)}{' '}
                        {t(`sup.unit.${supplement.unit}`)}
                      </span>
                    </button>

                    {editable &&
                      taken.map((log) => (
                        <div key={log.id} className="mb-1 ml-9 flex items-center gap-2">
                          <input
                            type="text"
                            inputMode="decimal"
                            aria-label={t('sup.dose')}
                            defaultValue={toInputValue(log.dose, lang, 2)}
                            onBlur={(e) => {
                              const dose = parseNumber(e.target.value)
                              if (dose !== undefined && dose !== log.dose) {
                                save.mutate({ ...log, dose })
                              }
                            }}
                            className={`${small} w-20`}
                          />
                          <span className="text-sm text-muted">
                            {t(`sup.unit.${supplement.unit}`)}
                          </span>
                          <input
                            type="time"
                            aria-label={t('sup.time')}
                            defaultValue={log.time?.slice(0, 5) ?? ''}
                            onBlur={(e) => {
                              const time = e.target.value || null
                              if (time !== (log.time?.slice(0, 5) ?? null)) {
                                save.mutate({ ...log, time })
                              }
                            }}
                            className={`${small} ml-auto`}
                          />
                        </div>
                      ))}
                    {over && (
                      <p className="mb-1 ml-9 text-xs text-warn">
                        {t('sup.overMax', {
                          max: formatNumber(supplement.daily_max!, lang, 2),
                          unit: t(`sup.unit.${supplement.unit}`),
                        })}
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}

      {caffeine > 0 && (
        <p className="border-t border-border pt-2 text-sm text-muted">
          {t('sup.caffeine', { mg: formatNumber(caffeine, lang, 0) })}
        </p>
      )}
      {error && (
        <p role="alert" className="pt-2 text-sm text-danger">
          {t(isNetworkError(error) ? 'app.serverUnreachable' : 'common.error')}
        </p>
      )}
    </div>
  )
}
