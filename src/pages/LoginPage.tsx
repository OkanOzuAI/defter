import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { signIn } from '../api/auth'
import { errorKey } from '../api/errors'
import { emailEnabled } from '../api/supabase'
import { AuthShell } from '../components/AuthShell'
import { Button, ErrorNote, Field, TextInput } from '../components/ui'
import { useT } from '../i18n'

export function LoginPage() {
  const t = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // On success the auth listener updates the session and the route guard redirects.
  const login = useMutation({ mutationFn: () => signIn(email.trim(), password) })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    login.mutate()
  }

  return (
    <AuthShell title={t('auth.login')}>
      <p className="-mt-3 mb-6 text-sm text-muted">{t('auth.tagline')}</p>
      <form onSubmit={onSubmit} className="space-y-4">
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
        <Field label={t('auth.password')}>
          <TextInput
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {login.isError && <ErrorNote>{t(errorKey(login.error))}</ErrorNote>}
        <Button type="submit" block disabled={login.isPending}>
          {login.isPending ? t('app.loading') : t('auth.login')}
        </Button>
      </form>

      {emailEnabled && (
        <Link to="/forgot" className="mt-2 flex min-h-11 items-center text-sm text-muted">
          {t('auth.forgot')}
        </Link>
      )}
      <p className="mt-4 text-sm text-muted">
        {t('auth.noAccount')}{' '}
        <Link to="/register" className="inline-flex min-h-11 items-center font-medium text-accent">
          {t('auth.register')}
        </Link>
      </p>
    </AuthShell>
  )
}
