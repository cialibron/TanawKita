// Unique ids for records made in the demo (applications, job posts). The time alone repeats when two taps land in
// the same millisecond, so a random part is added.
export function newId(prefix: string): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10)
  return `${prefix}-${Date.now().toString(36)}-${random}`
}
