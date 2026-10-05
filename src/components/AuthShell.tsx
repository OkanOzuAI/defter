import type { ReactNode } from 'react'
import { useT } from '../i18n'
import { LangSwitch } from './LangSwitch'

/** Frame for the pages shown before the app itself: login, register, onboarding, privacy. */
export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  const t = useT()

  return (
    <div className="min-h-full pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <div className="mx-auto max-w-md px-4 py-4">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold tracking-tight">{t('app.name')}</span>
          <LangSwitch />
        </div>
        <h1 className="mb-5 mt-8 text-2xl font-semibold">{title}</h1>
        {children}
      </div>
    </div>
  )
}
