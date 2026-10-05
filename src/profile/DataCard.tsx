import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import {
  countRows,
  exportAll,
  fetchAll,
  importAll,
  parseBackup,
  type TableName,
} from '../api/backup'
import { isNetworkError } from '../api/errors'
import { Button, Card, ErrorNote } from '../components/ui'
import { useT } from '../i18n'
import { downloadFile, toCsv } from '../lib/csv'
import { today } from '../lib/date'

const CSV: Record<string, { table: TableName; columns: string[] }> = {
  daily: {
    table: 'daily_logs',
    columns: [
      'date',
      'weight',
      'calories',
      'protein',
      'carbs',
      'fat',
      'fiber',
      'sodium_mg',
      'water_l',
      'sleep_h',
      'steps',
      'energy',
      'note',
    ],
  },
  sets: {
    table: 'set_logs',
    columns: [
      'date',
      'session_id',
      'exercise_id',
      'exercise_position',
      'superset_group',
      'set_index',
      'side',
      'set_type',
      'weight',
      'reps',
      'rir',
      'failure',
      'techniques',
      'done',
    ],
  },
  cardio: {
    table: 'cardio_sessions',
    columns: [
      'date',
      'type',
      'duration_min',
      'distance_km',
      'speed_kmh',
      'incline_pct',
      'level',
      'watts',
      'avg_hr',
      'max_hr',
      'kcal',
      'kcal_estimated',
      'intensity',
      'details',
      'note',
    ],
  },
}

/** Export everything as JSON, three tables as CSV, and import a JSON export back. */
export function DataCard() {
  const t = useT()
  const queryClient = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)

  const stamp = today()
  const exportJson = useMutation({
    mutationFn: async () => {
      const backup = await exportAll()
      downloadFile(`defter-${stamp}.json`, JSON.stringify(backup, null, 2), 'application/json')
    },
  })
  const exportCsv = useMutation({
    mutationFn: async (kind: keyof typeof CSV) => {
      const { table, columns } = CSV[kind]
      const rows = await fetchAll(table)
      rows.sort((a, b) => String(a.date).localeCompare(String(b.date)))
      downloadFile(`defter-${kind}-${stamp}.csv`, toCsv(rows, columns), 'text/csv;charset=utf-8')
    },
  })
  const importJson = useMutation({
    mutationFn: async (file: File) => {
      const backup = parseBackup(await file.text())
      if (!window.confirm(t('set.importConfirm', { n: countRows(backup) }))) return null
      return importAll(backup)
    },
    onSuccess: (written) => {
      if (written === null) return
      setMessage(t('set.importDone', { n: written }))
      // Everything on screen may have changed.
      void queryClient.invalidateQueries()
    },
  })

  const busy = exportJson.isPending || exportCsv.isPending || importJson.isPending
  const error = exportJson.error ?? exportCsv.error ?? importJson.error
  const errorText = !error
    ? null
    : isNetworkError(error)
      ? t('app.serverUnreachable')
      : error instanceof SyntaxError || error.message === 'Not a Defter export'
        ? t('set.importInvalid')
        : t('common.error')

  return (
    <Card className="space-y-2">
      <h2 className="text-sm text-muted">{t('set.data')}</h2>
      <Button variant="secondary" block disabled={busy} onClick={() => exportJson.mutate()}>
        {t('set.exportJson')}
      </Button>
      <p className="text-xs text-muted">{t('set.backupHint')}</p>
      <div className="grid grid-cols-1 gap-2">
        {(['daily', 'sets', 'cardio'] as const).map((kind) => (
          <Button
            key={kind}
            variant="secondary"
            disabled={busy}
            onClick={() => exportCsv.mutate(kind)}
          >
            {t(`set.export${kind === 'daily' ? 'Daily' : kind === 'sets' ? 'Sets' : 'Cardio'}`)}
          </Button>
        ))}
      </div>
      <Button variant="secondary" block disabled={busy} onClick={() => fileInput.current?.click()}>
        {t('set.importJson')}
      </Button>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          setMessage(null)
          if (file) importJson.mutate(file)
        }}
      />
      {busy && <p className="text-sm text-muted">{t('set.working')}</p>}
      {message && (
        <p role="status" className="text-sm text-accent">
          {message}
        </p>
      )}
      {errorText && <ErrorNote>{errorText}</ErrorNote>}
    </Card>
  )
}
