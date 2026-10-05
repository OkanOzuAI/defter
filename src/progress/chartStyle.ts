/** Shared look for every chart: quiet axes and grid, tooltip on the app's surface. */
export const axis = {
  tick: { fill: 'var(--muted)', fontSize: 11 },
  stroke: 'var(--border)',
  tickLine: false,
} as const

export const grid = { stroke: 'var(--border)', vertical: false } as const

export const tooltip = {
  contentStyle: {
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text)',
    fontSize: 13,
  },
  itemStyle: { color: 'var(--text)' },
  labelStyle: { color: 'var(--muted)' },
  cursor: { stroke: 'var(--muted)', strokeWidth: 1 },
} as const

export const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)']
