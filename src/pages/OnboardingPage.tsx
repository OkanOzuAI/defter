import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { signOut } from '../api/auth'
import { errorKey } from '../api/errors'
import { completeOnboarding } from '../api/onboarding'
import { UsernameTakenError } from '../api/profile'
import type { ActivityLevel, NewProfile, Sex } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { profileKey, rememberProfile } from '../auth/useProfile'
import { AuthShell } from '../components/AuthShell'
import { Button, ErrorNote, Field, NumberInput, Select, TextInput } from '../components/ui'
import { useLang, useT, type TKey } from '../i18n'
import { browserTimezone } from '../lib/date'
import { parseNumber } from '../lib/number'

const ACTIVITY_LEVELS: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'very', 'extra']
const SEXES: Sex[] = ['male', 'female']
const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/

const EMPTY = {
  username: '',
  displayName: '',
  weight: '',
  height: '',
  birthYear: '',
  sex: '',
  goalWeight: '',
  activity: '',
}

/** Blank optional field → null; a filled one must be a number inside [min, max]. */
function optionalNumber(text: string, min: number, max: number): number | null | undefined {
  if (text.trim() === '') return null
  const value = parseNumber(text)
  return value !== undefined && value >= min && value <= max ? value : undefined
}

export function OnboardingPage() {
  const t = useT()
  const lang = useLang()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [form, setForm] = useState(EMPTY)
  const [formError, setFormError] = useState<TKey | null>(null)

  const set = (field: keyof typeof EMPTY) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const save = useMutation({
    mutationFn: ({ profile, weight }: { profile: NewProfile; weight: number }) =>
      completeOnboarding(profile, weight),
    onSuccess: (profile) => {
      rememberProfile(profile)
      // The route guard sees the profile and moves on to the app.
      queryClient.setQueryData(profileKey(user?.id), profile)
    },
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const username = form.username.trim().toLowerCase()
    const displayName = form.displayName.trim()
    const weight = parseNumber(form.weight)
    const height = optionalNumber(form.height, 50, 260)
    const birthYear = optionalNumber(form.birthYear, 1900, new Date().getFullYear())
    const goalWeight = optionalNumber(form.goalWeight, 20, 400)

    if (!USERNAME_PATTERN.test(username)) return setFormError('onb.usernameInvalid')
    if (!displayName) return setFormError('onb.displayNameRequired')
    if (weight === undefined || weight < 20 || weight > 400)
      return setFormError('onb.weightInvalid')
    if (height === undefined || goalWeight === undefined || birthYear === undefined) {
      return setFormError('onb.invalidNumber')
    }
    if (birthYear !== null && !Number.isInteger(birthYear)) return setFormError('onb.invalidNumber')

    setFormError(null)
    save.mutate({
      weight,
      profile: {
        username,
        display_name: displayName,
        language: lang,
        height_cm: height,
        birth_year: birthYear,
        sex: (form.sex || null) as Sex | null,
        goal_weight: goalWeight,
        activity_level: (form.activity || null) as ActivityLevel | null,
        timezone: browserTimezone(),
      },
    })
  }

  const usernameTaken = save.error instanceof UsernameTakenError
  const error = formError ?? (save.isError && !usernameTaken ? errorKey(save.error) : null)
  const optional = t('common.optional')

  return (
    <AuthShell title={t('onb.title')}>
      <p className="-mt-3 mb-6 text-sm text-muted">{t('onb.subtitle')}</p>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field
          label={t('onb.username')}
          hint={t('onb.usernameHint')}
          error={usernameTaken ? t('onb.usernameTaken') : undefined}
        >
          <TextInput
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={20}
            value={form.username}
            onChange={(e) => {
              set('username')(e.target.value)
              if (usernameTaken) save.reset()
            }}
          />
        </Field>
        <Field label={t('onb.displayName')}>
          <TextInput
            autoComplete="name"
            maxLength={60}
            value={form.displayName}
            onChange={(e) => set('displayName')(e.target.value)}
          />
        </Field>
        <Field label={t('onb.weight')}>
          <NumberInput value={form.weight} onChange={(e) => set('weight')(e.target.value)} />
        </Field>

        <h2 className="pt-3 font-medium">{t('onb.optionalSection')}</h2>
        <p className="-mt-2 text-xs text-muted">{t('onb.optionalHint')}</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('onb.height')}>
            <NumberInput value={form.height} onChange={(e) => set('height')(e.target.value)} />
          </Field>
          <Field label={t('onb.birthYear')}>
            <NumberInput
              inputMode="numeric"
              maxLength={4}
              value={form.birthYear}
              onChange={(e) => set('birthYear')(e.target.value)}
            />
          </Field>
          <Field label={t('onb.sex')}>
            <Select value={form.sex} onChange={(e) => set('sex')(e.target.value)}>
              <option value="">{optional}</option>
              {SEXES.map((sex) => (
                <option key={sex} value={sex}>
                  {t(`onb.sex.${sex}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('onb.goalWeight')}>
            <NumberInput
              value={form.goalWeight}
              onChange={(e) => set('goalWeight')(e.target.value)}
            />
          </Field>
        </div>
        <Field label={t('onb.activity')}>
          <Select value={form.activity} onChange={(e) => set('activity')(e.target.value)}>
            <option value="">{optional}</option>
            {ACTIVITY_LEVELS.map((level) => (
              <option key={level} value={level}>
                {t(`onb.activity.${level}`)}
              </option>
            ))}
          </Select>
        </Field>

        {error && <ErrorNote>{t(error)}</ErrorNote>}
        <Button type="submit" block disabled={save.isPending}>
          {save.isPending ? t('common.saving') : t('onb.submit')}
        </Button>
      </form>
      <Button variant="ghost" block className="mt-2" onClick={() => signOut()}>
        {t('auth.logout')}
      </Button>
    </AuthShell>
  )
}
