import { useT, type TKey } from '../i18n'
import { Sheet } from './Sheet'

const TERMS = [
  'rir',
  'rpe',
  'failure',
  'near',
  'technical',
  'warmup',
  'top',
  'backoff',
  'drop',
  'restpause',
  'myo',
  'partials',
  'forced',
  'negatives',
  'tempo',
  'superset',
] as const

export function Glossary({ onClose }: { onClose: () => void }) {
  const t = useT()

  return (
    <Sheet title={t('glossary.title')} onClose={onClose}>
      <dl className="space-y-4">
        {TERMS.map((term) => (
          <div key={term}>
            <dt className="font-medium">{t(`glossary.${term}.t` as TKey)}</dt>
            <dd className="mt-0.5 text-sm leading-relaxed text-muted">
              {t(`glossary.${term}.d` as TKey)}
            </dd>
          </div>
        ))}
      </dl>
    </Sheet>
  )
}
