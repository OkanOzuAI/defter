import { useNavigate } from 'react-router-dom'
import { AuthShell } from '../components/AuthShell'
import { Button } from '../components/ui'
import { useT, type TKey } from '../i18n'

const SECTIONS: [TKey, TKey][] = [
  ['privacy.storedTitle', 'privacy.storedBody'],
  ['privacy.whoTitle', 'privacy.whoBody'],
  ['privacy.whereTitle', 'privacy.whereBody'],
  ['privacy.exportTitle', 'privacy.exportBody'],
  ['privacy.deleteTitle', 'privacy.deleteBody'],
]

export function PrivacyPage() {
  const t = useT()
  const navigate = useNavigate()

  return (
    <AuthShell title={t('privacy.title')}>
      <div className="space-y-5">
        {SECTIONS.map(([title, body]) => (
          <section key={title}>
            <h2 className="mb-1 font-medium">{t(title)}</h2>
            <p className="text-sm leading-relaxed text-muted">{t(body)}</p>
          </section>
        ))}
      </div>
      <Button variant="secondary" className="mt-6" onClick={() => navigate(-1)}>
        {t('common.back')}
      </Button>
    </AuthShell>
  )
}
