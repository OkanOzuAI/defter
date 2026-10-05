import { Outlet } from 'react-router-dom'
import { useT } from '../i18n'
import { useOnline } from '../lib/online'
import { BottomNav } from './BottomNav'
import { Header } from './Header'

export function Layout() {
  const t = useT()
  const online = useOnline()

  return (
    <div className="flex h-full flex-col">
      <Header />
      {!online && (
        <p role="status" className="bg-surface-2 px-4 py-2 text-center text-xs text-warn">
          {t('app.offline')}
        </p>
      )}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-xl px-4 py-4">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
