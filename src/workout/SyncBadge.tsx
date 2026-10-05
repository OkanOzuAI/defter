import { useT } from '../i18n'
import { useOnline } from '../lib/online'
import { usePendingCount, useSyncError } from './outbox'

/** Small saved / pending / offline indicator for the workout screen. */
export function SyncBadge() {
  const t = useT()
  const online = useOnline()
  const pending = usePendingCount()
  const failed = useSyncError()

  const state = !online ? 'offline' : pending === 0 ? 'saved' : failed ? 'error' : 'pending'
  const color = {
    saved: 'bg-accent',
    pending: 'bg-warn',
    offline: 'bg-muted',
    error: 'bg-danger',
  }[state]

  return (
    <span role="status" className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
      <span className={`size-2 rounded-full ${color}`} />
      {t(`sync.${state}`)}
    </span>
  )
}
