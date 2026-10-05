import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from '../components/ui'
import { useLang, useT } from '../i18n'
import { formatDate, type DateStr } from '../lib/date'
import { activePhase, dayTargets } from '../lib/diet'
import { formatNumber } from '../lib/number'
import { useDailyLogs, useDietPhases } from '../nutrition/hooks'
import { ChartBox, Legend, SectionTitle } from './chart'
import { axis, grid, tooltip } from './chartStyle'
import { weeklyNutrition, weekStarts } from './series'

export function NutritionSection({
  userId,
  today,
  days,
}: {
  userId: string
  today: DateStr
  days: number
}) {
  const t = useT()
  const lang = useLang()
  const weeks = weekStarts(today, Math.max(4, Math.ceil(days / 7)))
  const logs = useDailyLogs(userId, weeks[0], today)
  const phase = activePhase(useDietPhases(userId).data ?? [], today)

  if (logs.isPending) return <p className="py-6 text-sm text-muted">{t('app.loading')}</p>
  const rows = weeklyNutrition(logs.data ?? [], weeks)
  const targets = phase && dayTargets(phase, today, true)
  const short = (date: string) => formatDate(date, lang, { day: 'numeric', month: 'short' })
  const number = (value: number | null, digits = 0) =>
    value === null ? '–' : formatNumber(value, lang, digits)

  if (rows.every((row) => row.calories === null && row.protein === null)) {
    return <p className="py-6 text-sm text-muted">{t('prog.noData')}</p>
  }

  return (
    <Card>
      <SectionTitle>{t('prog.kcalTitle')}</SectionTitle>
      <ChartBox>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 10, right: 8, bottom: 0, left: -6 }}>
            <CartesianGrid {...grid} />
            <XAxis dataKey="week" tickFormatter={short} minTickGap={24} {...axis} />
            <YAxis tickFormatter={(value: number) => number(value)} {...axis} />
            <Tooltip
              {...tooltip}
              cursor={{ fill: 'var(--surface-2)' }}
              labelFormatter={(label) => short(String(label))}
              formatter={(value) => [`${number(Number(value))} kcal`, t('nut.calories')]}
            />
            {targets?.kcal != null && (
              <ReferenceLine y={targets.kcal} stroke="var(--muted)" strokeDasharray="4 4" />
            )}
            <Bar
              dataKey="calories"
              fill="var(--accent)"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartBox>
      {targets?.kcal != null && (
        <Legend
          items={[
            { label: t('nut.calories'), color: 'var(--accent)' },
            {
              label: `${t('prog.target')} (${number(targets.kcal)} kcal)`,
              color: 'var(--muted)',
              dashed: true,
            },
          ]}
        />
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="text-xs text-muted">
            <tr>
              <th className="py-1 text-left font-normal">{t('prog.week')}</th>
              <th className="font-normal">{t('prog.loggedDays')}</th>
              <th className="font-normal">kcal</th>
              {(['protein', 'carbs', 'fat'] as const).map((macro) => (
                <th key={macro} className="font-normal" title={t(`nut.f.${macro}`)}>
                  {t(`nut.f.${macro}`).slice(0, 1)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...rows].reverse().map((row) => (
              <tr key={row.week} className="border-t border-border">
                <td className="py-1.5 text-left text-muted">{short(row.week)}</td>
                <td>{row.days}</td>
                <td>{number(row.calories)}</td>
                <td>{number(row.protein)}</td>
                <td>{number(row.carbs)}</td>
                <td>{number(row.fat)}</td>
              </tr>
            ))}
            {targets && (
              <tr className="border-t border-border text-muted">
                <td className="py-1.5 text-left">{t('prog.target')}</td>
                <td />
                <td>{number(targets.kcal)}</td>
                <td>{number(targets.protein)}</td>
                <td>{number(targets.carbs)}</td>
                <td>{number(targets.fat)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
