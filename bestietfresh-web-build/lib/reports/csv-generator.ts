export interface CSVReportConfig {
  filename: string
  headers: string[]
  rows: (string | number)[][]
}

export function downloadCSVReport(config: CSVReportConfig) {
  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '""'
    const str = String(val).replace(/"/g, '""')
    return `"${str}"`
  }

  const headerLine = config.headers.map(escapeCSV).join(',')
  const rowLines = config.rows.map(r => r.map(escapeCSV).join(','))
  const csvContent = [headerLine, ...rowLines].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', config.filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
