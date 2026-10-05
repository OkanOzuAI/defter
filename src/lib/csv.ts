/** RFC 4180 CSV: fields with commas, quotes or line breaks are quoted; quotes are doubled. */
function cell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const text = Array.isArray(value)
    ? value.join('|')
    : typeof value === 'object'
      ? JSON.stringify(value)
      : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const lines = [
    columns.join(','),
    ...rows.map((row) => columns.map((c) => cell(row[c])).join(',')),
  ]
  return lines.join('\r\n') + '\r\n'
}

/** Hands a file to the browser's download dialog. */
export function downloadFile(name: string, content: string, type: string) {
  // The BOM makes Excel read UTF-8 (Turkish characters) correctly in CSV files.
  const blob = new Blob([type.startsWith('text/csv') ? '﻿' : '', content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
