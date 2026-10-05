import { Navigate, Outlet } from 'react-router-dom'
import { Button, FullScreen, Message } from '../components/ui'
import { useT } from '../i18n'
import { useAuth } from './AuthContext'
import { useProfile } from './useProfile'

function Loading() {
  const t = useT()
  return (
    <FullScreen>
      <p className="text-sm text-muted">{t('app.loading')}</p>
    </FullScreen>
  )
}

/** Login / register: signed-in users have no business here. */
export function PublicOnly() {
  const { session, loading } = useAuth()
  if (loading) return <Loading />
  if (session) return <Navigate to="/" replace />
  return <Outlet />
}

/**
 * Everything behind the login. `onboarding` flips which side of the profile check
 * the child routes sit on: the app needs a profile, the onboarding form needs none.
 */
export function RequireAuth({ onboarding = false }: { onboarding?: boolean }) {
  const t = useT()
  const { session, loading } = useAuth()
  const profile = useProfile()

  if (loading) return <Loading />
  if (!session) return <Navigate to="/login" replace />

  if (profile.data === undefined) {
    const unreachable = profile.isError || profile.fetchStatus === 'paused'
    if (!unreachable) return <Loading />
    return (
      <FullScreen>
        <Message
          title={t('app.serverUnreachable')}
          body={t('app.serverUnreachableHint')}
          action={<Button onClick={() => profile.refetch()}>{t('app.retry')}</Button>}
        />
      </FullScreen>
    )
  }

  const hasProfile = profile.data !== null
  if (onboarding) return hasProfile ? <Navigate to="/" replace /> : <Outlet />
  return hasProfile ? <Outlet /> : <Navigate to="/onboarding" replace />
}
