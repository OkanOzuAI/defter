import { useQuery } from '@tanstack/react-query'
import { getSetsInRange } from '../api/workouts'
import { Card } from '../components/ui'
import { useLang, useT } from '../i18n'
import { formatDate, type DateStr } from '../lib/date'
import { formatNumber } from '../lib/number'
import { useExercises } from '../workout/exercises'
import { workoutKey } from '../workout/hooks'
import { SectionTitle } from './chart'
import { hardSetsByWeek, sideVolumes, weekStarts } from './series'

const WEEKS = 9 // the current week plus the eight before it

export function VolumeSection({ userId, today }: { userId: string; today: DateStr }) {
  const t = useT()
  const lang = useLang()
  const resolveExercise = useExercises().get
  const weeks = weekStarts(today, WEEKS)
  // Newest first, so the current week sits next to the muscle names without scrolling.
  const order = weeks.map((_, i) => i).reverse()
  const sets = useQuery({
    queryKey: [...workoutKey(userId), 'range', weeks[0], today],
    queryFn: () => getSetsInRange(weeks[0], today),
  })

  if (sets.isPending) return <p className="py-6 text-sm text-muted">{t('app.loading')}</p>
  const rows = hardSetsByWeek(sets.data ?? [], resolveExercise, weeks)
  const sides = sideVolumes(sets.data ?? [], resolveExercise)
  const number = (value: number, digits = 1) => formatNumber(value, lang, digits)
  const peak = Math.max(1, ...rows.flatMap((row) => row.weeks))

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>{t('prog.hardSetsTitle')}</SectionTitle>
        {rows.length === 0 ? (
          <p className="py-4 text-sm text-muted">{t('prog.noData')}</p>
        ) : (
          // Wider than a phone: the table scrolls inside the card, the page does not.
          <div className="-mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-[520px] text-right text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="sticky left-0 bg-surface py-1 pr-2 text-left font-normal">
                    {t('prog.muscle')}
                  </th>
                  {order.map((i) => (
                    <th key={weeks[i]} className="px-1 font-normal">
                      {i === weeks.length - 1
                        ? t('prog.thisWeek')
                        : formatDate(weeks[i], lang, { day: 'numeric', month: 'numeric' })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.muscle} className="border-t border-border">
                    <td className="sticky left-0 bg-surface py-1.5 pr-2 text-left">
                      {t(`muscle.${row.muscle}`)}
                    </td>
                    {order.map((i) => {
                      const value = row.weeks[i]
                      return (
                        <td
                          key={weeks[i]}
                          className={
                            i === weeks.length - 1 ? 'px-1 font-semibold' : 'px-1 text-muted'
                          }
                          // One hue, stronger = more: a quick read of where the volume went.
                          style={{
                            background:
                              value > 0
                                ? `color-mix(in srgb, var(--accent) ${Math.round((value / peak) * 35)}%, transparent)`
                                : undefined,
                          }}
                        >
                          {value === 0 ? '·' : number(value)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-muted">{t('prog.hardSetsHint')}</p>
      </Card>

      <Card>
        <SectionTitle>{t('prog.sideTitle')}</SectionTitle>
        {sides.length === 0 ? (
          <p className="text-sm text-muted">{t('prog.sideNone')}</p>
        ) : (
          <ul className="space-y-3">
            {sides.map((side) => {
              const total = side.left + side.right || 1
              return (
                <li key={side.id}>
                  <p className="text-sm">{side.name}</p>
                  <div className="mt-1 flex h-2 gap-0.5 overflow-hidden rounded-full">
                    <div
                      className="bg-(--series-1)"
                      style={{ width: `${(side.left / total) * 100}%` }}
                    />
                    <div
                      className="bg-(--series-2)"
                      style={{ width: `${(side.right / total) * 100}%` }}
                    />
                  </div>
                  <p className="mt-1 flex justify-between text-xs text-muted">
                    <span>
                      {t('side.L')} {number(side.left, 0)} kg
                    </span>
                    <span>
                      {t('side.R')} {number(side.right, 0)} kg
                    </span>
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
