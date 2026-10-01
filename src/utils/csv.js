export function escapeCsvCell(value) {
  const text = value === null || value === undefined ? '' : String(value)

  if (/[",\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`
  }

  return text
}

export function buildCsv(rows) {
  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')
}
