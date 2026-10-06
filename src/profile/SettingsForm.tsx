import { useState } from 'react'
import { isNetworkError } from '../api/errors'
import { UsernameTakenError } from '../api/profile'
import type { ActivityLevel, Profile, Sex } from '../api/types'
import { useUpdateProfile } from '../auth/useProfile'
import { Button, Card, ErrorNote, Field, NumberInput, Select, TextInput } from '../components/ui'
import { useLang, useT, type Lang, type TKey } from '../i18n'
import { saltGToSodiumMg, sodiumMgToSaltG } from '../lib/calc'
import { parseNumber, toInputValue } from '../lib/number'
import type { Theme } from '../lib/theme'

const ACTIVITY: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'very', 'extra']
const USERNAME = /^[a-z0-9_]{3,20}$/

/** [field, label, min, max, whole numbers only] for the optional numeric profile fields. */
const NUMBERS = [
  ['height_cm', 'onb.height', 50, 260, false],
  ['birth_year', 'onb.birthYear', 1900, 2100, true],
  ['goal_weight', 'onb.goalWeight', 20, 400, false],
  ['rest_compound_sec', 'set.restCompound', 0, 3600, true],
  ['rest_isolation_sec', 'set.restIsolation', 0, 3600, true],
  ['sodium_target_mg', 'set.sodiumTarget', 0, 100000, true],
  ['water_target_l', 'set.waterTarget', 0, 20, false],
  ['step_goal', 'set.stepsTarget', 0, 200000, true],
  ['sleep_target_h', 'set.sleepTarget', 0, 24, false],
] as const
type NumberKey = (typeof NUMBERS)[number][0]
// Rest times always have a value; every other number may be left empty.
const REQUIRED: NumberKey[] = ['rest_compound_sec', 'rest_isolation_sec']

export function SettingsForm({ profile }: { profile: Profile }) {
  const t = useT()
  const lang = useLang()
  const update = useUpdateProfile()
  const [username, setUsername] = useState(profile.username)
  const [displayName, setDisplayName] = useState(profile.display_name)
  const [sex, setSex] = useState<Sex | ''>(profile.sex ?? '')
  const [activity, setActivity] = useState<ActivityLevel | ''>(profile.activity_level ?? '')
  const [language, setLanguage] = useState<Lang>(profile.language)
  const [intensity, setIntensity] = useState(profile.intensity_display)
  const [speedUnit, setSpeedUnit] = useState(profile.speed_unit)
  const [theme, setTheme] = useState<Theme>(profile.theme)
  const [numbers, setNumbers] = useState<Record<NumberKey, string>>(
    () =>
      Object.fromEntries(
        NUMBERS.map(([key]) => [key, toInputValue(profile[key], lang, 2)]),
      ) as Record<NumberKey, string>,
  )
  const [salt, setSalt] = useState(
    profile.sodium_target_mg
      ? toInputValue(sodiumMgToSaltG(profile.sodium_target_mg), lang, 2)
      : '',
  )
  const [formError, setFormError] = useState<TKey | null>(null)
  const [saved, setSaved] = useState(false)

  const setNumber = (key: NumberKey, text: string) => {
    setSaved(false)
    setNumbers((current) => ({ ...current, [key]: text }))
  }

  function submit() {
    const name = username.trim().toLowerCase()
    if (!USERNAME.test(name)) return setFormError('onb.usernameInvalid')
    if (!displayName.trim()) return setFormError('onb.displayNameRequired')

    const values = {} as Record<NumberKey, number | null>
    for (const [key, , min, max, whole] of NUMBERS) {
      const text = numbers[key].trim()
      if (text === '') {
        if (REQUIRED.includes(key)) return setFormError('onb.invalidNumber')
        values[key] = null
        continue
      }
      const value = parseNumber(text)
      if (value === undefined || value < min || value > max)
        return setFormError('onb.invalidNumber')
      values[key] = whole ? Math.round(value) : value
    }

    setFormError(null)
    update.mutate(
      {
        username: name,
        display_name: displayName.trim(),
        sex: sex || null,
        activity_level: activity || null,
        language,
        intensity_display: intensity,
        speed_unit: speedUnit,
        theme,
        ...values,
        rest_compound_sec: values.rest_compound_sec!,
        rest_isolation_sec: values.rest_isolation_sec!,
      },
      { onSuccess: () => setSaved(true) },
    )
  }

  const number = (key: NumberKey, decimal = true) => {
    const label = NUMBERS.find(([k]) => k === key)![1]
    return (
      <Field label={t(label)}>
        <NumberInput
          inputMode={decimal ? 'decimal' : 'numeric'}
          value={numbers[key]}
          onChange={(e) => setNumber(key, e.target.value)}
        />
      </Field>
    )
  }

  const taken = update.error instanceof UsernameTakenError
  const error =
    formError ??
    (update.isError && !taken
      ? isNetworkError(update.error)
        ? 'app.serverUnreachable'
        : 'common.error'
      : null)

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h2 className="text-sm text-muted">{t('set.account')}</h2>
        <Field label={t('onb.displayName')}>
          <TextInput
            value={displayName}
            maxLength={60}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </Field>
        <Field
          label={t('onb.username')}
          hint={t('onb.usernameHint')}
          error={taken ? t('onb.usernameTaken') : undefined}
        >
          <TextInput
            value={username}
            maxLength={20}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => setUsername(e.target.value)}
          />
        </Field>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-sm text-muted">{t('set.body')}</h2>
        <div className="grid grid-cols-2 gap-3">
          {number('height_cm')}
          {number('birth_year', false)}
          <Field label={t('onb.sex')}>
            <Select value={sex} onChange={(e) => setSex(e.target.value as Sex | '')}>
              <option value="">–</option>
              <option value="male">{t('onb.sex.male')}</option>
              <option value="female">{t('onb.sex.female')}</option>
            </Select>
          </Field>
          {number('goal_weight')}
        </div>
        <Field label={t('onb.activity')}>
          <Select
            value={activity}
            onChange={(e) => setActivity(e.target.value as ActivityLevel | '')}
          >
            <option value="">–</option>
            {ACTIVITY.map((level) => (
              <option key={level} value={level}>
                {t(`onb.activity.${level}`)}
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-sm text-muted">{t('set.prefs')}</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('onb.language')}>
            <Select value={language} onChange={(e) => setLanguage(e.target.value as Lang)}>
              <option value="tr">Türkçe</option>
              <option value="en">English</option>
            </Select>
          </Field>
          <Field label={t('set.theme')}>
            <Select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
              <option value="dark">{t('set.theme.dark')}</option>
              <option value="light">{t('set.theme.light')}</option>
            </Select>
          </Field>
          <Field label={t('set.intensity')}>
            <Select
              value={intensity}
              onChange={(e) => setIntensity(e.target.value as Profile['intensity_display'])}
            >
              <option value="rir">RIR</option>
              <option value="rpe">RPE</option>
            </Select>
          </Field>
          <Field label={t('set.speedUnit')}>
            <Select
              value={speedUnit}
              onChange={(e) => setSpeedUnit(e.target.value as Profile['speed_unit'])}
            >
              <option value="kmh">km/h</option>
              <option value="mph">mph</option>
            </Select>
          </Field>
          {number('rest_compound_sec', false)}
          {number('rest_isolation_sec', false)}
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-sm text-muted">{t('set.targets')}</h2>
        <div className="grid grid-cols-2 gap-3">
          {/* Salt and sodium are one target typed two ways. */}
          <Field label={t('set.saltTarget')}>
            <NumberInput
              value={salt}
              onChange={(e) => {
                setSalt(e.target.value)
                const grams = parseNumber(e.target.value)
                if (e.target.value.trim() === '') setNumber('sodium_target_mg', '')
                else if (grams !== undefined) {
                  setNumber('sodium_target_mg', String(Math.round(saltGToSodiumMg(grams))))
                }
              }}
            />
          </Field>
          <Field label={t('set.sodiumTarget')}>
            <NumberInput
              inputMode="numeric"
              value={numbers.sodium_target_mg}
              onChange={(e) => {
                setNumber('sodium_target_mg', e.target.value)
                const mg = parseNumber(e.target.value)
                setSalt(mg === undefined ? '' : toInputValue(sodiumMgToSaltG(mg), lang, 2))
              }}
            />
          </Field>
          {number('water_target_l')}
          {number('step_goal', false)}
          {number('sleep_target_h')}
        </div>
      </Card>

      {error && <ErrorNote>{t(error)}</ErrorNote>}
      {saved && (
        <p role="status" className="text-center text-sm text-accent">
          {t('set.saved')}
        </p>
      )}
      <Button block disabled={update.isPending} onClick={submit}>
        {update.isPending ? t('common.saving') : t('common.save')}
      </Button>
    </div>
  )
}
