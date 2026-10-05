import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { changePassword, deleteAccount, signOut } from '../api/auth'
import { errorKey } from '../api/errors'
import { useAuth } from '../auth/AuthContext'
import { useProfile } from '../auth/useProfile'
import { Button, Card, ErrorNote, Field, TextInput } from '../components/ui'
import { useT, type TKey } from '../i18n'
import { DataCard } from '../profile/DataCard'
import { SettingsForm } from '../profile/SettingsForm'

const SECTIONS: [string, TKey][] = [
  ['/profile/phases', 'phases.title'],
  ['/profile/supplements', 'sup.title'],
  ['/profile/exercises', 'set.library'],
  ['/workout/templates', 'tpl.title'],
  ['/privacy', 'profile.privacy'],
]

export function ProfilePage() {
  const t = useT()
  const { user } = useAuth()
  const { data: profile } = useProfile()

  if (!profile || !user) return null

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{t('profile.title')}</h1>
        <p className="truncate text-sm text-muted">{user.email}</p>
      </div>

      <Card>
        <h2 className="mb-1 text-sm text-muted">{t('set.sections')}</h2>
        <ul>
          {SECTIONS.map(([to, label]) => (
            <li key={to} className="border-t border-border first:border-t-0">
              <Link to={to} className="flex min-h-12 items-center justify-between gap-3">
                <span>{t(label)}</span>
                <span className="text-muted" aria-hidden="true">
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <SettingsForm key={profile.id} profile={profile} />

      <PasswordCard />
      <DataCard />

      <Button variant="secondary" block onClick={() => signOut()}>
        {t('auth.logout')}
      </Button>
      <DeleteAccountCard userId={user.id} username={profile.username} />
    </div>
  )
}

function PasswordCard() {
  const t = useT()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [formError, setFormError] = useState<TKey | null>(null)
  const change = useMutation({
    mutationFn: () => changePassword(password),
    onSuccess: () => {
      setPassword('')
      setConfirm('')
    },
  })

  function submit() {
    if (password.length < 8) return setFormError('auth.err.weakPassword')
    if (password !== confirm) return setFormError('auth.err.passwordMismatch')
    setFormError(null)
    change.mutate()
  }

  const error = formError ?? (change.isError ? errorKey(change.error) : null)

  return (
    <Card className="space-y-3">
      <h2 className="text-sm text-muted">{t('set.password')}</h2>
      <Field label={t('set.newPassword')} hint={t('auth.passwordHint')}>
        <TextInput
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <Field label={t('auth.passwordConfirm')}>
        <TextInput
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </Field>
      {error && <ErrorNote>{t(error)}</ErrorNote>}
      {change.isSuccess && !error && (
        <p role="status" className="text-sm text-accent">
          {t('set.passwordChanged')}
        </p>
      )}
      <Button variant="secondary" block disabled={change.isPending} onClick={submit}>
        {change.isPending ? t('common.saving') : t('set.password')}
      </Button>
    </Card>
  )
}

function DeleteAccountCard({ userId, username }: { userId: string; username: string }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  // On success the auth listener sees the sign-out and the app returns to the login page.
  const remove = useMutation({ mutationFn: () => deleteAccount(userId) })

  if (!open) {
    return (
      <Button variant="ghost" block className="text-danger" onClick={() => setOpen(true)}>
        {t('set.deleteAccount')}
      </Button>
    )
  }

  return (
    <Card className="space-y-3 border-danger">
      <h2 className="font-medium text-danger">{t('set.deleteAccount')}</h2>
      <p className="text-sm text-muted">{t('set.deleteWarning', { username })}</p>
      <TextInput
        aria-label={t('onb.username')}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
      />
      {remove.isError && <ErrorNote>{t(errorKey(remove.error))}</ErrorNote>}
      <Button
        variant="danger"
        block
        disabled={typed.trim() !== username || remove.isPending}
        onClick={() => remove.mutate()}
      >
        {remove.isPending ? t('app.loading') : t('set.deleteConfirm')}
      </Button>
      <Button variant="ghost" block onClick={() => setOpen(false)}>
        {t('common.cancel')}
      </Button>
    </Card>
  )
}
