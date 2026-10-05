import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { isNetworkError } from '../api/errors'
import { deleteSupplementLog, saveSupplementLog } from '../api/supplements'
import type { SupplementLog } from '../api/types'
import { useLang, useT } from '../i18n'
import { nowTime, type DateStr } from '../lib/date'
import { caffeineTotal, doseTotals } from '../lib/diet'
import { formatNumber, parseNumber, toInputValue } from '../lib/number'
import { supplementLogsKey, useSupplementLogs, useSupplements } from './hooks'

const control =
  'min-h-11 min-w-0 rounded-lg border border-border bg-surface-2 px-2 focus:border-accent focus:outline-none'

/**
 * The day's supplements as a log, not a checklist: pick one from the list, type the
 * amount actually taken, add it. Nothing is assumed to be taken every day.
 */
export function SupplementLogger({ userId, date }: { userId: string; date: DateStr }) {
  const t = useT()
  const lang = useLang()
  const queryClient = useQueryClient()
  const supplements = useSupplements(userId)
  const logs = useSupplementLogs(userId, date, date)
  const logsKey = [...supplementLogsKey(userId), date, date]
  const [picked, setPicked] = useState('')
  const [dose, setDose] = useState('')
  const [badDose, setBadDose] = useState(false)

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

  const all = supplements.data
  const byId = new Map(all.map((supplement) => [supplement.id, supplement]))
  const chosen = byId.get(picked)
  const dayLogs = logs.data
  const totals = doseTotals(dayLogs)
  const caffeine = caffeineTotal(dayLogs, all)
  const error = save.error ?? remove.error
  const unit = (id: string) => {
    const supplement = byId.get(id)
    return supplement ? t(`sup.unit.${supplement.unit}`) : ''
  }

  function pick(id: string) {
    setPicked(id)
    setBadDose(false)
    // The usual serving is only a starting point; the amount is the user's to type.
    setDose(toInputValue(byId.get(id)?.dose, lang, 2))
  }

  function add() {
    if (!chosen) return
    const amount = parseNumber(dose)
    if (amount === undefined || amount <= 0) return setBadDose(true)
    save.mutate({
      id: crypto.randomUUID(),
      user_id: userId,
      date,
      supplement_id: chosen.id,
      dose: amount,
      time: nowTime(),
    })
    setPicked('')
    setDose('')
  }

  const options = (active: boolean) =>
    all
      .filter((supplement) => supplement.active === active)
      .map((supplement) => (
        <option key={supplement.id} value={supplement.id}>
          {supplement.name}
        </option>
      ))

  return (
    <div>
      <select
        aria-label={t('sup.pick')}
        value={picked}
        onChange={(e) => pick(e.target.value)}
        className={`${control} w-full`}
      >
        <option value="">{t('sup.pick')}</option>
        <optgroup label={t('sup.activeSection')}>{options(true)}</optgroup>
        <optgroup label={t('sup.inactiveSection')}>{options(false)}</optgroup>
      </select>

      {chosen && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            aria-label={t('sup.dose')}
            aria-invalid={badDose}
            value={dose}
            onChange={(e) => {
              setDose(e.target.value)
              setBadDose(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add()
            }}
            className={`${control} w-24 text-center text-lg ${badDose ? 'border-danger' : ''}`}
          />
          <span className="min-w-0 flex-1 truncate text-sm text-muted">{unit(chosen.id)}</span>
          <button
            type="button"
            onClick={add}
            className="min-h-11 shrink-0 rounded-lg bg-accent px-5 font-medium text-accent-fg"
          >
            {t('sup.addLog')}
          </button>
        </div>
      )}
      {badDose && <p className="mt-1 text-xs text-danger">{t('nut.invalid')}</p>}

      {dayLogs.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{t('sup.noneToday')}</p>
      ) : (
        <ul className="mt-3">
          {dayLogs.map((log) => {
            const supplement = byId.get(log.supplement_id)
            // The warning sits on the last entry of a supplement, once per supplement.
            const lastOfKind =
              dayLogs.findLast((l) => l.supplement_id === log.supplement_id) === log
            const over =
              lastOfKind &&
              supplement?.daily_max != null &&
              (totals.get(log.supplement_id) ?? 0) > supplement.daily_max
            return (
              <li key={log.id} className="border-t border-border py-2">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{supplement?.name ?? '–'}</span>
                    <span className="block text-xs text-muted">{log.time?.slice(0, 5)}</span>
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    aria-label={`${supplement?.name ?? ''} ${t('sup.dose')}`}
                    key={log.dose}
                    defaultValue={toInputValue(log.dose, lang, 2)}
                    onBlur={(e) => {
                      const amount = parseNumber(e.target.value)
                      if (amount !== undefined && amount > 0 && amount !== log.dose) {
                        save.mutate({ ...log, dose: amount })
                      } else {
                        e.target.value = toInputValue(log.dose, lang, 2)
                      }
                    }}
                    className={`${control} w-20 text-center`}
                  />
                  <span className="w-12 shrink-0 truncate text-sm text-muted">
                    {unit(log.supplement_id)}
                  </span>
                  <button
                    type="button"
                    aria-label={`${supplement?.name ?? ''}: ${t('sup.remove')}`}
                    onClick={() => remove.mutate(log.id)}
                    className="size-11 shrink-0 text-lg text-muted"
                  >
                    ✕
                  </button>
                </div>
                {over && (
                  <p className="mt-1 text-xs text-warn">
                    {t('sup.overMax', {
                      max: formatNumber(supplement.daily_max!, lang, 2),
                      unit: unit(log.supplement_id),
                    })}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}

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
      <Link
        to="/profile/supplements"
        className="mt-1 flex min-h-11 items-center text-sm text-accent"
      >
        {t('sup.manage')} ›
      </Link>
    </div>
  )
}
