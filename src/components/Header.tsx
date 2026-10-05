import { Link } from 'react-router-dom'
import { useT } from '../i18n'
import { LangSwitch } from './LangSwitch'

export function Header() {
  const t = useT()

  return (
    <header className="border-b border-border bg-surface pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-xl items-center justify-between gap-3 px-4">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          {t('app.name')}
        </Link>
        <div className="flex items-center gap-2">
          <LangSwitch />
          <Link
            to="/profile"
            aria-label={t('nav.profile')}
            className="flex size-11 items-center justify-center rounded-full border border-border bg-surface-2 text-muted"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 20c.8-3.5 3.5-5 7-5s6.2 1.5 7 5" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  )
}
