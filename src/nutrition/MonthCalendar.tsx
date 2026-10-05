import { useState } from 'react'
import { useLang } from '../i18n'
import {
  addDays,
  dateRange,
  formatDate,
  monthBounds,
  startOfWeek,
  weekdayNames,
  type DateStr,
} from '../lib/date'
import { useDailyLogs } from './hooks'

type Props = {
  userId: string
  selected: DateStr
  today: DateStr
  onPick: (date: DateStr) => void
}

/** Small month grid; days that have a log carry a dot. */
export function MonthCalendar({ userId, selected, today, onPick }: Props) {
  const lang = useLang()
  const [month, setMonth] = useState(() => monthBounds(selected).first)
  const { first, last } = monthBounds(month)
  const logs = useDailyLogs(userId, first, last)
  const logged = new Set(logs.data?.map((log) => log.date))

  // Whole weeks, Monday first, padded with the neighbouring months' days.
  const days = dateRange(startOfWeek(first), addDays(startOfWeek(last), 6))
  const arrow = 'size-11 text-lg text-muted'

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="‹"
          className={arrow}
          onClick={() => setMonth(monthBounds(addDays(first, -1)).first)}
        >
          ‹
        </button>
        <span className="font-medium">
          {formatDate(first, lang, { month: 'long', year: 'numeric' })}
        </span>
        <button
          type="button"
          aria-label="›"
          className={arrow}
          onClick={() => setMonth(addDays(last, 1))}
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 text-center">
        {weekdayNames(lang).map((name) => (
          <span key={name} className="py-1 text-[11px] text-muted">
            {name}
          </span>
        ))}
        {days.map((day) => {
          const outside = day < first || day > last
          const isSelected = day === selected
          return (
            <button
              key={day}
              type="button"
              disabled={day > today}
              aria-pressed={isSelected}
              aria-label={formatDate(day, lang)}
              onClick={() => onPick(day)}
              className={
                'relative mx-auto flex size-10 items-center justify-center rounded-full text-sm disabled:opacity-30 ' +
                (isSelected ? 'bg-accent font-semibold text-accent-fg ' : '') +
                (outside && !isSelected ? 'text-muted/50 ' : '') +
                (day === today && !isSelected ? 'border border-accent ' : '')
              }
            >
              {Number(day.slice(8))}
              {logged.has(day) && (
                <span
                  className={
                    'absolute bottom-1 size-1 rounded-full ' +
                    (isSelected ? 'bg-accent-fg' : 'bg-accent')
                  }
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
