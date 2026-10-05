import { Message } from '../components/ui'
import { useT, type TKey } from '../i18n'

/** Tab shell used until each section's real page lands in its build phase. */
export function SectionPage({ title, empty }: { title: TKey; empty: TKey }) {
  const t = useT()

  return (
    <>
      <h1 className="text-xl font-semibold">{t(title)}</h1>
      <Message title={t(empty)} body={t('page.comingSoon')} />
    </>
  )
}
