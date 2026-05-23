export type SyncLogEntry = {
  ts: number
  step: string
  detail?: string
}

const MAX_ENTRIES = 80
const entries: SyncLogEntry[] = []
const listeners = new Set<() => void>()

function formatDetail(detail?: Record<string, unknown>): string | undefined {
  if (!detail || Object.keys(detail).length === 0) return undefined
  try {
    return JSON.stringify(detail)
  } catch {
    return String(detail)
  }
}

function push(step: string, detail?: Record<string, unknown>) {
  const entry: SyncLogEntry = {
    ts: Date.now(),
    step,
    detail: formatDetail(detail),
  }
  entries.push(entry)
  if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES)
  console.log(
    `[benkyou sync] ${step}`,
    detail ?? "",
  )
  listeners.forEach((fn) => fn())
}

export function syncLog(step: string, detail?: Record<string, unknown>) {
  push(step, detail)
}

export async function syncLogTimed<T>(
  step: string,
  fn: () => Promise<T>,
  detail?: Record<string, unknown>,
): Promise<T> {
  push(`${step} → start`, detail)
  const t0 = performance.now()
  try {
    const result = await fn()
    push(`${step} → done`, {
      ...detail,
      ms: Math.round(performance.now() - t0),
    })
    return result
  } catch (e) {
    push(`${step} → error`, {
      ...detail,
      ms: Math.round(performance.now() - t0),
      error: e instanceof Error ? e.message : String(e),
    })
    throw e
  }
}

export function getSyncLogEntries(): readonly SyncLogEntry[] {
  return entries
}

export function clearSyncLog() {
  entries.length = 0
  listeners.forEach((fn) => fn())
}

export function subscribeSyncLog(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function formatSyncLogLine(e: SyncLogEntry): string {
  const time = new Date(e.ts).toLocaleTimeString()
  return e.detail ? `${time} ${e.step} ${e.detail}` : `${time} ${e.step}`
}
