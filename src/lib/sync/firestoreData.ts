/** Firestore rejects document fields set to `undefined` (optional TS fields often are). */

export function stripUndefinedDeep<T>(value: T): T {
  if (value === undefined || value === null) {
    return value
  }
  if (typeof value !== "object") {
    return value
  }
  if (value instanceof Date) {
    return value
  }
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as T
  }
  const out: Record<string, unknown> = {}
  for (const [key, field] of Object.entries(value as Record<string, unknown>)) {
    if (field === undefined) continue
    out[key] = stripUndefinedDeep(field)
  }
  return out as T
}
