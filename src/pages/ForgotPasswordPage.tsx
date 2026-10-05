import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../api/auth'
import { errorKey } from '../api/errors'
import { AuthShell } from '../components/AuthShell'
import { Button, ErrorNote, Field, TextInput } from '../components/ui'
import { useT } from '../i18n'

/** Only routed when VITE_EMAIL_ENABLED=true (needs custom SMTP in Supabase). */
export function ForgotPasswordPage() {
  const t = useT()
  const [email, setEmail] = useState('')
  const reset = useMutation({ mutationFn: () => requestPasswordReset(email.trim()) })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    reset.mutate()
  }

  return (
    <AuthShell title={t('auth.forgotTitle')}>
      {reset.isSuccess ? (
        <p className="text-sm text-muted">{t('auth.forgotSent')}</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <p className="text-sm text-muted">{t('auth.forgotHint')}</p>
          <Field label={t('auth.email')}>
            <TextInput
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          {reset.isError && <ErrorNote>{t(errorKey(reset.error))}</ErrorNote>}
          <Button type="submit" block disabled={reset.isPending}>
            {reset.isPending ? t('app.loading') : t('auth.forgotSend')}
          </Button>
        </form>
      )}
      <Link to="/login" className="mt-4 flex min-h-11 items-center font-medium text-accent">
        {t('auth.login')}
      </Link>
    </AuthShell>
  )
}
