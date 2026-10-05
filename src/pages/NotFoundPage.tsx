import { Link } from 'react-router-dom'
import { FullScreen, Message } from '../components/ui'
import { useT } from '../i18n'

export function NotFoundPage() {
  const t = useT()

  return (
    <FullScreen>
      <Message
        title={t('app.notFound')}
        action={
          <Link to="/" className="flex min-h-11 items-center text-accent">
            {t('app.backHome')}
          </Link>
        }
      />
    </FullScreen>
  )
}
