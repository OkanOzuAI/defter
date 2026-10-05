import type { ReactNode } from 'react'
import { useT } from '../i18n'

/** Full-screen panel for picking things (exercises, glossary). Never used to log a set. */
export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const t = useT()

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex flex-col bg-bg pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]"
    >
      <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3 border-b border-border px-4">
        <h2 className="truncate py-3 text-lg font-semibold">{title}</h2>
        <button type="button" onClick={onClose} className="min-h-11 shrink-0 px-2 text-accent">
          {t('ex.close')}
        </button>
      </div>
      <div className="mx-auto w-full max-w-xl flex-1 overflow-y-auto px-4 py-3">{children}</div>
    </div>
  )
}
