import { useState } from 'react'
import { useT } from '../i18n'
import { Sheet } from './Sheet'
import type { CopyMode } from './types'

type Props = {
  onChoose: (mode: CopyMode) => void | Promise<void>
  onClose: () => void
}

/** Asked once when starting from a saved workout or copying a past session. */
export function CopyModeSheet({ onChoose, onClose }: Props) {
  const t = useT()
  const [busy, setBusy] = useState(false)

  const option = (mode: CopyMode) => (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        await onChoose(mode)
      }}
      className="block w-full rounded-xl border border-border bg-surface p-4 text-left disabled:opacity-50"
    >
      <span className="block font-medium">{t(`copy.${mode}`)}</span>
      <span className="mt-1 block text-sm text-muted">{t(`copy.${mode}Hint`)}</span>
    </button>
  )

  return (
    <Sheet title={t('copy.title')} onClose={onClose}>
      <div className="space-y-3">
        {option('values')}
        {option('structure')}
        {busy && <p className="text-sm text-muted">{t('app.loading')}</p>}
      </div>
    </Sheet>
  )
}
