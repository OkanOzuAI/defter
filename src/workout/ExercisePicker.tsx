import { useMemo, useState } from 'react'
import { CATEGORIES, EXERCISES, type Category, type Exercise } from '../data/exercises'
import { useT } from '../i18n'
import { Sheet } from './Sheet'

type Props = {
  title: string
  onPick: (exercise: Exercise) => void
  onClose: () => void
  /** Shown first, e.g. swap alternatives. The full library stays one tap away. */
  suggested?: Exercise[]
  suggestedEmpty?: string
}

const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ')

export function ExercisePicker({ title, onPick, onClose, suggested, suggestedEmpty }: Props) {
  const t = useT()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | null>(null)
  const [showAll, setShowAll] = useState(!suggested)

  const results = useMemo(() => {
    const words = normalize(query).split(' ').filter(Boolean)
    return EXERCISES.filter(
      (exercise) =>
        (!category || exercise.category === category) &&
        words.every((word) => normalize(exercise.name).includes(word)),
    )
  }, [query, category])

  const row = (exercise: Exercise) => (
    <li key={exercise.id}>
      <button
        type="button"
        onClick={() => onPick(exercise)}
        className="flex min-h-12 w-full items-center justify-between gap-3 border-b border-border py-2 text-left"
      >
        <span>{exercise.name}</span>
        <span className="shrink-0 text-xs text-muted">{t(`equip.${exercise.equipment}`)}</span>
      </button>
    </li>
  )

  if (!showAll && suggested) {
    return (
      <Sheet title={title} onClose={onClose}>
        {suggested.length === 0 ? (
          <p className="py-6 text-sm text-muted">{suggestedEmpty}</p>
        ) : (
          <ul>{suggested.map(row)}</ul>
        )}
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-2 min-h-11 text-accent"
        >
          {t('ex.showAll')}
        </button>
      </Sheet>
    )
  }

  const chip = (value: Category | null, label: string) => (
    <button
      key={value ?? 'all'}
      type="button"
      aria-pressed={category === value}
      onClick={() => setCategory(value)}
      className={
        'min-h-11 shrink-0 rounded-full border px-3.5 text-sm ' +
        (category === value ? 'border-accent bg-accent text-accent-fg' : 'border-border text-muted')
      }
    >
      {label}
    </button>
  )

  return (
    <Sheet title={title} onClose={onClose}>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('ex.search')}
        autoCorrect="off"
        className="block min-h-11 w-full rounded-lg border border-border bg-surface-2 px-3 placeholder:text-muted/60 focus:border-accent focus:outline-none"
      />
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 py-3">
        {chip(null, t('ex.all'))}
        {CATEGORIES.map((value) => chip(value, t(`cat.${value}`)))}
      </div>
      {results.length === 0 ? (
        <p className="py-6 text-sm text-muted">{t('ex.noResults')}</p>
      ) : (
        <ul>{results.map(row)}</ul>
      )}
    </Sheet>
  )
}
