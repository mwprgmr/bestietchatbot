export function normalizePhoneNumber(phone: string): string {
  if (!phone) return ''
  // Strip spaces, dashes, parentheses, plus signs
  let cleaned = phone.replace(/[\s\-\(\)\+]/g, '').trim()
  return cleaned
}
