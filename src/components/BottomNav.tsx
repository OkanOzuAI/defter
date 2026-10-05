import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useT, type TKey } from '../i18n'

const icon = (path: ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    width="22"
    height="22"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {path}
  </svg>
)

const TABS: { to: string; label: TKey; icon: ReactNode }[] = [
  {
    to: '/',
    label: 'nav.today',
    icon: icon(
      <>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3v4M16 3v4M4 10h16" />
      </>,
    ),
  },
  {
    to: '/workout',
    label: 'nav.workout',
    icon: icon(<path d="M3 12h18M6 8v8M18 8v8M3.5 10v4M20.5 10v4" />),
  },
  {
    to: '/nutrition',
    label: 'nav.nutrition',
    icon: icon(
      <>
        <path d="M7 3v7a2 2 0 0 0 2 2v9M11 3v7a2 2 0 0 1-2 2M9 3v6" />
        <path d="M16 21v-8c-1.5-1-2-3-2-5.5C14 5 15 3 17 3v18" />
      </>,
    ),
  },
  {
    to: '/cardio',
    label: 'nav.cardio',
    icon: icon(<path d="M3 12h4l2-5 4 10 2-5h6" />),
  },
  {
    to: '/progress',
    label: 'nav.progress',
    icon: icon(<path d="M4 20V4M4 20h16M8 16l4-5 3 3 4-6" />),
  },
]

export function BottomNav() {
  const t = useT()

  return (
    <nav className="border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-xl">
        {TABS.map((tab) => (
          <li key={tab.to} className="min-w-0 flex-1">
            <NavLink
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                'flex min-h-14 flex-col items-center justify-center gap-0.5 px-0.5 ' +
                (isActive ? 'text-accent' : 'text-muted')
              }
            >
              {tab.icon}
              <span className="max-w-full truncate text-[11px] leading-tight">{t(tab.label)}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
