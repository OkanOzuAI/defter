import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { signUp } from '../api/auth'
import { errorKey } from '../api/errors'
import { AuthShell } from '../components/AuthShell'
import { Button, ErrorNote, Field, TextInput } from '../components/ui'
import { useT, type TKey } from '../i18n'

const MIN_PASSWORD = 8

export function RegisterPage() {
  const t = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [formError, setFormError] = useState<TKey | null>(null)

  // With "Confirm email" off the user is signed in right away and the route guard
  // moves them to onboarding; with it on, `data` is true and we show the inbox screen.
  const register = useMutation({ mutationFn: () => signUp(email.trim(), password) })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (password.length < MIN_PASSWORD) return setFormError('auth.err.weakPassword')
    if (password !== confirm) return setFormError('auth.err.passwordMismatch')
    setFormError(null)
    register.mutate()
  }

  if (register.data === true) {
    return (
      <AuthShell title={t('auth.checkInboxTitle')}>
        <p className="text-sm text-muted">{t('auth.checkInboxBody', { email: email.trim() })}</p>
        <Link to="/login" className="mt-4 flex min-h-11 items-center font-medium text-accent">
          {t('auth.login')}
        </Link>
      </AuthShell>
    )
  }

  const error = formError ?? (register.isError ? errorKey(register.error) : null)

  return (
    <AuthShell title={t('auth.register')}>
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
        <Field label={t('auth.password')} hint={t('auth.passwordHint')}>
          <TextInput
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label={t('auth.passwordConfirm')}>
          <TextInput
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>
        {error && <ErrorNote>{t(error)}</ErrorNote>}
        <Button type="submit" block disabled={register.isPending}>
          {register.isPending ? t('app.loading') : t('auth.register')}
        </Button>
      </form>

      <p className="mt-4 text-xs text-muted">
        {t('auth.privacyNote')}{' '}
        <Link to="/privacy" className="inline-flex min-h-11 items-center text-accent">
          {t('auth.privacyLink')}
        </Link>
      </p>
      <p className="text-sm text-muted">
        {t('auth.haveAccount')}{' '}
        <Link to="/login" className="inline-flex min-h-11 items-center font-medium text-accent">
          {t('auth.login')}
        </Link>
      </p>
    </AuthShell>
  )
}
