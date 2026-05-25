export type SyncLogEntry = {
  ts: number
  step: string
  detail?: string
}

const MAX_ENTRIES = 200
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

function formatDetailForUi(detail: string | undefined): string {
  if (!detail) return ""
  try {
    const o = JSON.parse(detail) as Record<string, unknown>
    if (typeof o.error === "string") return ` — ${o.error}`
    if (typeof o.ms === "number" && Object.keys(o).length <= 2) {
      return ` (${o.ms} ms)`
    }
    if (typeof o.pulled === "number" && typeof o.total === "number") {
      return ` — ${o.pulled} downloaded, ${o.alreadyLocal} local, ${o.failed} failed (${o.total} referenced)`
    }
    if (typeof o.mediaCount === "number") {
      return ` — ${o.mediaCount} images, ${o.cards} cards`
    }
    if (typeof o.count === "number") {
      return ` — ${o.count}`
    }
    if (typeof o.decks === "number") {
      return ` — ${o.decks} decks, ${o.cards} cards`
    }
  } catch {
    /* fall through */
  }
  if (detail.length > 120) return ` — ${detail.slice(0, 117)}…`
  return ` — ${detail}`
}

/** Human-readable line for Settings sync progress (null = hide in list). */
export function formatSyncLogEntryForUi(entry: SyncLogEntry): string | null {
  if (entry.step.endsWith(" → start")) return null

  const time = new Date(entry.ts).toLocaleTimeString()
  let step = entry.step
    .replace(/ → done$/, "")
    .replace(/ → error$/, " (failed)")

  if (step.startsWith("Firestore getDocs ")) {
    const m = step.match(/^Firestore getDocs (\w+.*) \((\w+)\)$/)
    if (m) step = `Loaded ${m[1]} (${m[2]})`
  }
  if (step === "syncNow finished OK") step = "Sync finished"
  if (step === "runFullSync complete") step = "All steps complete"
  if (step === "hydrate card images complete") step = "Cached images for review"

  return `${time}  ${step}${formatDetailForUi(entry.detail)}`
}

/** Short label for the current step (shown above the log while syncing). */
export function formatSyncStatusLabel(entry: SyncLogEntry | undefined): string {
  if (!entry) return "Syncing…"
  if (entry.step.endsWith(" → start")) {
    return entry.step.replace(/ → start$/, "")
  }
  const ui = formatSyncLogEntryForUi(entry)
  if (ui) return ui.replace(/^\d{1,2}:\d{2}:\d{2}\s+(AM|PM)?\s*/i, "").trim()
  return entry.step.replace(/ → (done|error)$/, "")
}

/** @deprecated Use formatSyncLogEntryForUi */
export function formatSyncLogLine(e: SyncLogEntry): string {
  return formatSyncLogEntryForUi(e) ?? `${new Date(e.ts).toLocaleTimeString()} ${e.step}`
}
