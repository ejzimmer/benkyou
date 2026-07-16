export type SyncLogEntry = {
  ts: number
  step: string
  detail?: string
}

const MAX_ENTRIES = 80
let entries: SyncLogEntry[] = []
const listeners = new Set<() => void>()

// A media-heavy sync can push thousands of entries in a tight loop (two per
// item — "start"/"done" — across hundreds of concurrent items). Notifying
// listeners synchronously on every push turns that into a same-tick React
// re-render per entry, which can itself stall the UI thread for the
// duration — the exact "frozen" symptom a live progress log is meant to
// prevent. Coalescing into at most one notification per frame keeps the log
// visibly live without re-rendering thousands of times a second.
let notifyScheduled = false
function scheduleNotify() {
  if (notifyScheduled) return
  notifyScheduled = true
  const flush = () => {
    notifyScheduled = false
    listeners.forEach((fn) => fn())
  }
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(flush)
  } else {
    setTimeout(flush, 16)
  }
}

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
  // Rebind to a new array (rather than mutating in place) so subscribers
  // that store `entries` in state (e.g. React's `setState`) see a changed
  // reference and actually re-render — a live sync can push thousands of
  // entries, and consumers that never see a new reference never update.
  const next = entries.length >= MAX_ENTRIES
    ? [...entries.slice(entries.length - MAX_ENTRIES + 1), entry]
    : [...entries, entry]
  entries = next
  console.log(
    `[benkyou sync] ${step}`,
    detail ?? "",
  )
  scheduleNotify()
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
  entries = []
  scheduleNotify()
}

export function subscribeSyncLog(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function formatSyncLogLine(e: SyncLogEntry): string {
  const time = new Date(e.ts).toLocaleTimeString()
  return e.detail ? `${time} ${e.step} ${e.detail}` : `${time} ${e.step}`
}
