import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useT } from '../i18n'
import { today as todayDate } from '../lib/date'
import { CardioSection } from '../progress/CardioSection'
import { ConsistencySection } from '../progress/ConsistencySection'
import { MeasurementsSection } from '../progress/MeasurementsSection'
import { NutritionSection } from '../progress/NutritionSection'
import { StrengthSection } from '../progress/StrengthSection'
import { VolumeSection } from '../progress/VolumeSection'
import { WeightSection } from '../progress/WeightSection'

const TABS = [
  'weight',
  'nutrition',
  'strength',
  'volume',
  'cardio',
  'consistency',
  'measurements',
] as const
type Tab = (typeof TABS)[number]

const RANGES = [30, 90, 180]
// Sections whose charts follow the range picker; the others have a fixed window.
const RANGED: Tab[] = ['weight', 'nutrition', 'cardio']

const chip = (active: boolean) =>
  'min-h-11 shrink-0 rounded-full border px-3.5 text-sm ' +
  (active ? 'border-accent bg-accent text-accent-fg' : 'border-border text-muted')

export function ProgressPage() {
  const t = useT()
  const { user } = useAuth()
  const userId = user!.id
  const today = todayDate()
  const [tab, setTab] = useState<Tab>('weight')
  const [days, setDays] = useState(90)

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">{t('nav.progress')}</h1>

      <div role="tablist" className="-mx-4 flex gap-2 overflow-x-auto px-4">
        {TABS.map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            className={chip(tab === value)}
            onClick={() => setTab(value)}
          >
            {t(`prog.tab.${value}`)}
          </button>
        ))}
      </div>

      {RANGED.includes(tab) && (
        <div role="group" aria-label={t('prog.range')} className="flex gap-2">
          {RANGES.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={days === value}
              className={chip(days === value)}
              onClick={() => setDays(value)}
            >
              {t('prog.days', { n: value })}
            </button>
          ))}
        </div>
      )}

      {tab === 'weight' && <WeightSection userId={userId} today={today} days={days} />}
      {tab === 'nutrition' && <NutritionSection userId={userId} today={today} days={days} />}
      {tab === 'strength' && <StrengthSection userId={userId} />}
      {tab === 'volume' && <VolumeSection userId={userId} today={today} />}
      {tab === 'cardio' && <CardioSection userId={userId} today={today} days={days} />}
      {tab === 'consistency' && <ConsistencySection userId={userId} today={today} />}
      {tab === 'measurements' && <MeasurementsSection userId={userId} today={today} />}
    </div>
  )
}
