import { setLang, useLang, useT, type Lang } from '../i18n'

const LANGS: Lang[] = ['tr', 'en']

export function LangSwitch({ onChange }: { onChange?: (lang: Lang) => void }) {
  const lang = useLang()
  const t = useT()

  return (
    <div
      role="group"
      aria-label={t('lang.switch')}
      className="flex overflow-hidden rounded-lg border border-border text-sm"
    >
      {LANGS.map((code) => (
        <button
          key={code}
          type="button"
          aria-pressed={lang === code}
          onClick={() => {
            setLang(code)
            onChange?.(code)
          }}
          className={
            'min-h-11 min-w-11 px-2.5 font-medium ' +
            (lang === code ? 'bg-surface-2 text-text' : 'text-muted')
          }
        >
          {t(`lang.${code}`)}
        </button>
      ))}
    </div>
  )
}
