import { Link } from 'react-router-dom'
import { signOut } from '../api/auth'
import { useAuth } from '../auth/AuthContext'
import { useProfile } from '../auth/useProfile'
import { Button, Card } from '../components/ui'
import { useT } from '../i18n'

export function ProfilePage() {
  const t = useT()
  const { user } = useAuth()
  const { data: profile } = useProfile()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t('profile.title')}</h1>
      <Card>
        <h2 className="mb-2 text-sm text-muted">{t('profile.account')}</h2>
        <p className="truncate font-medium">{profile?.display_name}</p>
        <p className="truncate text-sm text-muted">@{profile?.username}</p>
        <p className="truncate text-sm text-muted">{user?.email}</p>
      </Card>
      <Link to="/profile/supplements" className="flex min-h-11 items-center text-accent">
        {t('sup.title')}
      </Link>
      <Link to="/privacy" className="flex min-h-11 items-center text-accent">
        {t('profile.privacy')}
      </Link>
      <Button variant="secondary" block onClick={() => signOut()}>
        {t('auth.logout')}
      </Button>
    </div>
  )
}
