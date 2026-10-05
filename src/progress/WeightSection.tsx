import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from '../components/ui'
import { useLang, useT } from '../i18n'
import { weeklyRate } from '../lib/calc'
import { addDays, formatDate, type DateStr } from '../lib/date'
import { formatNumber } from '../lib/number'
import { useDailyLogs, useDietPhases } from '../nutrition/hooks'
import { ChartBox, Legend, SectionTitle } from './chart'
import { axis, grid, tooltip } from './chartStyle'
import { tdeeSeries, weightSeries } from './series'

export function WeightSection({
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
  const from = addDays(today, -(days - 1))
  // Extra lead-in so the averages at the left edge are already complete.
  const logs = useDailyLogs(userId, addDays(from, -27), today)
  const phases = useDietPhases(userId).data ?? []

  if (logs.isPending) return <p className="py-6 text-sm text-muted">{t('app.loading')}</p>
  const data = logs.data ?? []
  const series = weightSeries(data, from, today)
  const tdee = tdeeSeries(data, from, today)
  const rate = weeklyRate(data, today)
  const hasWeight = series.some((row) => row.weight !== null)
  const hasSalt = series.some((row) => row.saltG !== null)

  const short = (date: string) => formatDate(date, lang, { day: 'numeric', month: 'short' })
  const number = (value: number, digits = 1) => formatNumber(value, lang, digits)
  const signed = (value: number, digits = 2) =>
    `${value > 0 ? '+' : value < 0 ? '−' : ''}${number(Math.abs(value), digits)}`
  const bands = phases
    .map((phase) => ({
      id: phase.id,
      label: t(`phase.${phase.type}`),
      x1: phase.start_date < from ? from : phase.start_date,
      x2: !phase.end_date || phase.end_date > today ? today : phase.end_date,
    }))
    .filter((band) => band.x1 <= band.x2)

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>{t('prog.weightTitle')}</SectionTitle>
        {rate && (
          <p className="mb-2 text-sm">
            <span className="text-muted">{t('prog.weeklyChange')}: </span>
            {signed(rate.kg)} kg ({signed(rate.pct)}%)
          </p>
        )}
        {!hasWeight ? (
          <p className="py-6 text-sm text-muted">{t('prog.noData')}</p>
        ) : (
          <>
            <ChartBox height={220}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={series} margin={{ top: 14, right: 8, bottom: 0, left: -14 }}>
                  <CartesianGrid {...grid} />
                  {bands.map((band) => (
                    <ReferenceArea
                      key={band.id}
                      x1={band.x1}
                      x2={band.x2}
                      fill="var(--muted)"
                      fillOpacity={0.12}
                      stroke="none"
                      label={{
                        value: band.label,
                        position: 'insideTop',
                        fill: 'var(--muted)',
                        fontSize: 10,
                      }}
                    />
                  ))}
                  <XAxis dataKey="date" tickFormatter={short} minTickGap={32} {...axis} />
                  <YAxis
                    domain={[
                      (min: number) => Math.floor(min - 0.5),
                      (max: number) => Math.ceil(max + 0.5),
                    ]}
                    allowDecimals={false}
                    tickFormatter={(value: number) => number(value, 0)}
                    {...axis}
                  />
                  <Tooltip
                    {...tooltip}
                    labelFormatter={(label) => short(String(label))}
                    formatter={(value, name) => [`${number(Number(value), 2)} kg`, name]}
                  />
                  <Scatter
                    name={t('prog.daily')}
                    dataKey="weight"
                    fill="var(--muted)"
                    shape={(props: { cx?: number; cy?: number }) =>
                      props.cy == null ? (
                        <g />
                      ) : (
                        <circle cx={props.cx} cy={props.cy} r={2.5} fill="var(--muted)" />
                      )
                    }
                    isAnimationActive={false}
                  />
                  <Line
                    name={t('prog.avg7')}
                    dataKey="avg"
                    type="monotone"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartBox>
            <Legend
              items={[
                { label: t('prog.daily'), color: 'var(--muted)', dot: true },
                { label: t('prog.avg7'), color: 'var(--accent)' },
              ]}
            />
            {bands.length > 0 && <p className="mt-1 text-xs text-muted">{t('prog.phases')}</p>}
          </>
        )}

        {/* Salt gets its own small chart on the same days: two scales never share one plot. */}
        {hasWeight && hasSalt && (
          <div className="mt-4 border-t border-border pt-3">
            <SectionTitle>{t('prog.saltTitle')}</SectionTitle>
            <ChartBox height={90}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: -14 }}>
                  <XAxis dataKey="date" tickFormatter={short} minTickGap={32} {...axis} />
                  <YAxis
                    tickCount={3}
                    tickFormatter={(value: number) => number(value, 0)}
                    {...axis}
                  />
                  <Tooltip
                    {...tooltip}
                    cursor={{ fill: 'var(--surface-2)' }}
                    labelFormatter={(label) => short(String(label))}
                    formatter={(value) => [`${number(Number(value), 1)} g`, t('today.salt')]}
                  />
                  <Bar
                    dataKey="saltG"
                    fill="var(--series-4)"
                    radius={[2, 2, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>
            <p className="mt-1 text-xs text-muted">{t('prog.saltHint')}</p>
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle>{t('prog.tdeeTitle')}</SectionTitle>
        {tdee.length < 2 ? (
          <p className="text-sm text-muted">
            {tdee.length === 1 && (
              <span className="mr-2 text-lg font-semibold text-text">
                {number(tdee[0].tdee, 0)} kcal
              </span>
            )}
            {t('prog.tdeeNeed')}
          </p>
        ) : (
          <>
            <p className="mb-2 text-lg font-semibold">{number(tdee.at(-1)!.tdee, 0)} kcal</p>
            <ChartBox height={150}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tdee} margin={{ top: 6, right: 8, bottom: 0, left: -6 }}>
                  <CartesianGrid {...grid} />
                  <XAxis dataKey="date" tickFormatter={short} minTickGap={32} {...axis} />
                  <YAxis
                    domain={['auto', 'auto']}
                    tickFormatter={(value: number) => number(value, 0)}
                    {...axis}
                  />
                  <Tooltip
                    {...tooltip}
                    labelFormatter={(label) => short(String(label))}
                    formatter={(value) => [`${number(Number(value), 0)} kcal`, 'TDEE']}
                  />
                  <Line
                    dataKey="tdee"
                    type="monotone"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartBox>
          </>
        )}
      </Card>
    </div>
  )
}
