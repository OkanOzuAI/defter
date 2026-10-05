import { useLang } from '../i18n'
import { weekdayNames } from '../lib/date'

/** Seven toggles, 1 = Monday … 7 = Sunday. */
export function WeekdayPicker({
  value,
  onChange,
  label,
}: {
  value: number[]
  onChange: (weekdays: number[]) => void
  label: string
}) {
  const lang = useLang()
  const names = weekdayNames(lang)

  return (
    <div role="group" aria-label={label} className="flex gap-1">
      {names.map((name, i) => {
        const day = i + 1
        const active = value.includes(day)
        return (
          <button
            key={day}
            type="button"
            aria-pressed={active}
            onClick={() =>
              onChange(active ? value.filter((d) => d !== day) : [...value, day].sort())
            }
            className={
              'min-h-11 min-w-0 flex-1 rounded-lg border text-xs ' +
              (active ? 'border-accent bg-accent text-accent-fg' : 'border-border text-muted')
            }
          >
            {name}
          </button>
        )
      })}
    </div>
  )
}
