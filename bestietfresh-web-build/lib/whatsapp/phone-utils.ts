export function normalizePhoneNumber(phone: string): string {
  if (!phone) return ''
  // Strip spaces, dashes, parentheses, plus signs
  let cleaned = phone.replace(/[\s\-\(\)\+]/g, '').trim()
  return cleaned
}

/**
 * Returns today's business date in 'Asia/Kolkata' timezone as YYYY-MM-DD.
 * Ensures server UTC offsets never skew inventory queries vs admin dashboard.
 */
export function getBusinessDate(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(new Date())
}
