import type { ReactNode } from 'react'

/** Legend in text colour with a swatch per series; identity never rests on colour alone. */
type LegendItem = { label: string; color: string; dashed?: boolean; dot?: boolean }

export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          {item.dot ? (
            <span
              aria-hidden="true"
              className="inline-block size-1.5 rounded-full"
              style={{ background: item.color }}
            />
          ) : (
            <span
              aria-hidden="true"
              className="inline-block w-4"
              style={{
                height: item.dashed ? 2 : 3,
                background: item.dashed
                  ? `repeating-linear-gradient(90deg, ${item.color} 0 4px, transparent 4px 7px)`
                  : item.color,
              }}
            />
          )}
          {item.label}
        </li>
      ))}
    </ul>
  )
}

export function ChartBox({ height = 180, children }: { height?: number; children: ReactNode }) {
  return <div style={{ height }}>{children}</div>
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-2 text-sm text-muted">{children}</h2>
}
