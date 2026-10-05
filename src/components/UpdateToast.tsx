import { useRegisterSW } from 'virtual:pwa-register/react'
import { useT } from '../i18n'

const HOUR = 60 * 60 * 1000

/** Shown when a new version has been deployed and is ready to take over. */
export function UpdateToast() {
  const t = useT()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // An installed app can stay open for days: look for a new version now and then.
      if (registration) setInterval(() => void registration.update(), HOUR)
    },
  })

  if (!needRefresh) return null

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-40 mx-auto flex max-w-md items-center gap-3 rounded-xl border border-border bg-surface-2 px-4 py-2 shadow-lg"
    >
      <span className="min-w-0 flex-1 text-sm">{t('app.updateAvailable')}</span>
      <button
        type="button"
        className="min-h-11 shrink-0 px-2 font-medium text-accent"
        onClick={() => void updateServiceWorker(true)}
      >
        {t('app.updateReload')}
      </button>
      <button
        type="button"
        aria-label={t('ex.close')}
        className="min-h-11 shrink-0 px-1 text-muted"
        onClick={() => setNeedRefresh(false)}
      >
        ✕
      </button>
    </div>
  )
}
