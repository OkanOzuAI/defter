import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { isNetworkError } from '../api/errors'
import {
  deleteMeasurement,
  listMeasurements,
  MEASUREMENT_FIELDS,
  saveMeasurement,
  type Measurement,
  type MeasurementField,
} from '../api/measurements'
import { Button, Card, ErrorNote, NumberInput, Select, TextInput } from '../components/ui'
import { useLang, useT } from '../i18n'
import { formatDate, isDateStr, type DateStr } from '../lib/date'
import { formatNumber, parseNumber, toInputValue } from '../lib/number'
import { ChartBox, SectionTitle } from './chart'
import { axis, grid, tooltip } from './chartStyle'

const key = (userId: string) => ['measurements', userId] as const

export function MeasurementsSection({ userId, today }: { userId: string; today: DateStr }) {
  const t = useT()
  const lang = useLang()
  const queryClient = useQueryClient()
  const [metric, setMetric] = useState<MeasurementField>('waist')
  const [date, setDate] = useState(today)
  // Typed values per date, so switching the date shows that day's saved numbers.
  const [edits, setEdits] = useState<Partial<Record<MeasurementField, string>>>({})
  const [invalid, setInvalid] = useState(false)

  const list = useQuery({ queryKey: key(userId), queryFn: listMeasurements })
  const refresh = () => {
    setEdits({})
    return queryClient.invalidateQueries({ queryKey: key(userId) })
  }
  const save = useMutation({ mutationFn: saveMeasurement, onSuccess: refresh })
  const remove = useMutation({ mutationFn: deleteMeasurement, onSuccess: refresh })

  if (list.isPending) return <p className="py-6 text-sm text-muted">{t('app.loading')}</p>
  const rows = list.data ?? []
  const existing = rows.find((row) => row.date === date)
  const points = rows.filter((row) => row[metric] !== null)
  const unit = metric === 'body_fat' ? '%' : 'cm'
  const short = (value: string) => formatDate(value, lang, { day: 'numeric', month: 'short' })
  const number = (value: number) => formatNumber(value, lang, 1)

  function submit() {
    const next = { date } as Measurement
    for (const field of MEASUREMENT_FIELDS) {
      const text = edits[field]
      if (text === undefined) next[field] = existing?.[field] ?? null
      else if (text.trim() === '') next[field] = null
      else {
        const value = parseNumber(text)
        if (value === undefined || value <= 0) return setInvalid(true)
        next[field] = value
      }
    }
    setInvalid(false)
    save.mutate(next)
  }

  const error = save.error ?? remove.error

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>{t('prog.measureTitle')}</SectionTitle>
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">{t('prog.metric')}</span>
          <Select value={metric} onChange={(e) => setMetric(e.target.value as MeasurementField)}>
            {MEASUREMENT_FIELDS.map((field) => (
              <option key={field} value={field}>
                {t(`measure.${field}`)}
              </option>
            ))}
          </Select>
        </label>
        {points.length === 0 ? (
          <p className="py-4 text-sm text-muted">{t('prog.measureEmpty')}</p>
        ) : (
          <>
            <p className="mt-3 text-lg font-semibold">
              {number(points.at(-1)![metric]!)} {unit}
              <span className="ml-2 text-sm font-normal text-muted">
                {short(points.at(-1)!.date)}
              </span>
            </p>
            {points.length > 1 && (
              <ChartBox height={160}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
                    <CartesianGrid {...grid} />
                    <XAxis dataKey="date" tickFormatter={short} minTickGap={28} {...axis} />
                    <YAxis domain={['auto', 'auto']} tickFormatter={number} {...axis} />
                    <Tooltip
                      {...tooltip}
                      labelFormatter={(label) => short(String(label))}
                      formatter={(value) => [
                        `${number(Number(value))} ${unit}`,
                        t(`measure.${metric}`),
                      ]}
                    />
                    <Line
                      dataKey={metric}
                      type="monotone"
                      stroke="var(--accent)"
                      strokeWidth={2}
                      dot={{
                        r: 4,
                        fill: 'var(--accent)',
                        stroke: 'var(--surface)',
                        strokeWidth: 2,
                      }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartBox>
            )}
          </>
        )}
      </Card>

      <Card>
        <SectionTitle>{t('prog.measureAdd')}</SectionTitle>
        <label className="mb-3 block">
          <span className="mb-1.5 block text-sm text-muted">{t('prog.measureDate')}</span>
          <TextInput
            type="date"
            value={date}
            max={today}
            onChange={(e) => {
              if (!isDateStr(e.target.value)) return
              setDate(e.target.value)
              setEdits({})
            }}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          {MEASUREMENT_FIELDS.map((field) => (
            <label key={field} className="block min-w-0">
              <span className="mb-1 flex justify-between gap-2 text-sm text-muted">
                <span className="truncate">{t(`measure.${field}`)}</span>
                {field !== 'body_fat' && <span className="shrink-0 text-xs">cm</span>}
              </span>
              <NumberInput
                value={edits[field] ?? toInputValue(existing?.[field], lang, 1)}
                onChange={(e) => setEdits({ ...edits, [field]: e.target.value })}
              />
            </label>
          ))}
        </div>
        {invalid && <p className="mt-2 text-sm text-danger">{t('nut.invalid')}</p>}
        {error && (
          <div className="mt-2">
            <ErrorNote>
              {t(isNetworkError(error) ? 'app.serverUnreachable' : 'common.error')}
            </ErrorNote>
          </div>
        )}
        <Button block className="mt-3" disabled={save.isPending} onClick={submit}>
          {save.isPending ? t('common.saving') : t('common.save')}
        </Button>
        {existing && (
          <Button variant="ghost" block className="mt-1" onClick={() => remove.mutate(date)}>
            {t('prog.measureDelete')}
          </Button>
        )}
      </Card>
    </div>
  )
}
