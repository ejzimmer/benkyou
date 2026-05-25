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

/** Sort keys and drop undefined so Firestore round-trips compare equal to local data. */
export function normalizeForCompare(value: unknown): unknown {
  const stripped = stripUndefinedDeep(value)
  if (stripped === null || typeof stripped !== "object") {
    return stripped
  }
  if (Array.isArray(stripped)) {
    return stripped.map((item) => normalizeForCompare(item))
  }
  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(stripped as Record<string, unknown>).sort()) {
    sorted[key] = normalizeForCompare(
      (stripped as Record<string, unknown>)[key],
    )
  }
  return sorted
}

export function stableCompareJson(a: unknown, b: unknown): boolean {
  return (
    JSON.stringify(normalizeForCompare(a)) ===
    JSON.stringify(normalizeForCompare(b))
  )
}
