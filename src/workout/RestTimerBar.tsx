import { useEffect } from 'react'
import { useT } from '../i18n'
import { formatClock } from '../lib/calc'
import { useNow } from './hooks'
import { restOverSignal } from './sound'
import type { RestState } from './types'

type Props = {
  rest: RestState
  onChange: (rest: RestState | null) => void
}

/** Sticky rest countdown. Stored as an end time, so it stays right after a locked screen. */
export function RestTimerBar({ rest, onChange }: Props) {
  const t = useT()
  const now = useNow(250)
  const remainingMs = rest.endsAt - now
  const over = remainingMs <= 0

  useEffect(() => {
    if (!over) return
    // Only signal if it ran out just now, not when reopening the app much later.
    if (Date.now() - rest.endsAt < 3000) restOverSignal()
    onChange(null)
  }, [over, rest.endsAt, onChange])

  const shift = (seconds: number) =>
    onChange({
      endsAt: rest.endsAt + seconds * 1000,
      totalSec: Math.max(0, rest.totalSec + seconds),
    })

  const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000))
  const progress = rest.totalSec > 0 ? Math.min(1, Math.max(0, remainingSec / rest.totalSec)) : 0
  const button = 'min-h-11 min-w-12 rounded-lg border border-border px-2 text-sm'

  return (
    <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-surface px-4 pb-2 pt-2">
      <div className="h-1 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full bg-accent" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1">
          <p className="text-xs text-muted">{t('rest.title')}</p>
          <p role="timer" className="text-2xl font-semibold leading-tight">
            {formatClock(remainingSec)}
          </p>
        </div>
        <button type="button" className={button} onClick={() => shift(-15)}>
          −15
        </button>
        <button type="button" className={button} onClick={() => shift(15)}>
          +15
        </button>
        <button type="button" className={`${button} text-accent`} onClick={() => onChange(null)}>
          {t('rest.skip')}
        </button>
      </div>
    </div>
  )
}
