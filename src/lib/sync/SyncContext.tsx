import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useAuth } from "../auth/AuthContext"
import { getFirestoreDb, getFirebaseStorage } from "../firebase"
import { SyncConflictModal } from "./SyncConflictModal"
import { readLastSyncedAt, runFullSync, type SyncProgress } from "./runSync"
import {
  clearSyncLog,
  getSyncLogEntries,
  subscribeSyncLog,
  syncLog,
  type SyncLogEntry,
} from "./syncLog"
import type { SyncConflict, SyncConflictChoice } from "./syncTypes"

export type SyncPhase = "idle" | "running" | "conflict"

type SyncState = {
  syncing: boolean
  syncPhase: SyncPhase
  syncStatusLabel: string
  syncProgress: SyncProgress | null
  /** True once the first sync of this session has settled (or none is needed). */
  initialSyncComplete: boolean
  syncLog: readonly SyncLogEntry[]
  lastError: string | null
  lastSyncedAt: number | null
  syncNow: () => Promise<void>
  conflictActive: boolean
}

const Ctx = createContext<SyncState | null>(null)

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user, offlineOnly } = useAuth()
  const [syncing, setSyncing] = useState(false)
  const [syncPhase, setSyncPhase] = useState<SyncPhase>("idle")
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)
  /** uid whose initial sync has settled this session (success or failure). */
  const [completedSyncUid, setCompletedSyncUid] = useState<string | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const [activeConflict, setActiveConflict] = useState<SyncConflict | null>(null)
  const [syncLogEntries, setSyncLogEntries] = useState<readonly SyncLogEntry[]>(
    () => getSyncLogEntries(),
  )
  const conflictNumberRef = useRef(0)
  const [conflictNumber, setConflictNumber] = useState(0)

  useEffect(() => {
    setLastSyncedAt(readLastSyncedAt())
    return subscribeSyncLog(() => setSyncLogEntries(getSyncLogEntries()))
  }, [])

  const resolveRef = useRef<((choice: SyncConflictChoice) => void) | null>(null)
  const applyAllChoiceRef = useRef<SyncConflictChoice | null>(null)

  const onConflict = useCallback((conflict: SyncConflict) => {
    const preset = applyAllChoiceRef.current
    if (preset) {
      syncLog("bulk conflict choice", {
        choice: preset,
        entityType: conflict.entityType,
        entityId: conflict.entityId,
      })
      return Promise.resolve(preset)
    }
    return new Promise<SyncConflictChoice>((resolve) => {
      syncLog("waiting for user conflict choice", {
        entityType: conflict.entityType,
        entityId: conflict.entityId,
      })
      conflictNumberRef.current += 1
      setConflictNumber(conflictNumberRef.current)
      resolveRef.current = resolve
      setActiveConflict(conflict)
      setSyncPhase("conflict")
      setSyncing(false)
    })
  }, [])

  const handleConflictChoice = useCallback(
    (choice: SyncConflictChoice, applyToAllRemaining: boolean) => {
      if (applyToAllRemaining) {
        applyAllChoiceRef.current = choice
        syncLog("user chose apply to all remaining conflicts", { choice })
      } else {
        syncLog("user resolved conflict", { choice })
      }
      setActiveConflict(null)
      setSyncPhase("running")
      setSyncing(true)
      resolveRef.current?.(choice)
      resolveRef.current = null
    },
    [],
  )

  const syncInFlightRef = useRef<Promise<void> | null>(null)

  const syncNow = useCallback(async () => {
    if (offlineOnly || !user) {
      syncLog("sync skipped", { offlineOnly, hasUser: Boolean(user) })
      return
    }
    if (syncInFlightRef.current) {
      syncLog("sync already in flight — joining existing run")
      return syncInFlightRef.current
    }

    const run = (async () => {
      clearSyncLog()
      syncLog("syncNow invoked", { uid: user.uid })
      const fs = getFirestoreDb()
      const storage = getFirebaseStorage()
      if (!fs || !storage) {
        syncLog("sync aborted: Firebase not ready", {
          hasFirestore: Boolean(fs),
          hasStorage: Boolean(storage),
        })
        // Nothing we can do — don't block review on a sync that can't run.
        setCompletedSyncUid(user.uid)
        return
      }
      setSyncing(true)
      setSyncPhase("running")
      setSyncProgress(null)
      setLastError(null)
      conflictNumberRef.current = 0
      setConflictNumber(0)
      applyAllChoiceRef.current = null
      try {
        await runFullSync({
          fs,
          storage,
          uid: user.uid,
          onConflict,
          onProgress: setSyncProgress,
        })
        setLastSyncedAt(Date.now())
        syncLog("syncNow finished OK")
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        syncLog("syncNow failed", { error: msg })
        setLastError(msg)
        throw e
      } finally {
        setSyncing(false)
        setSyncPhase("idle")
        setSyncProgress(null)
        // The first sync of the session has settled (success or failure); stop
        // blocking review either way.
        setCompletedSyncUid(user.uid)
        setActiveConflict(null)
        conflictNumberRef.current = 0
        setConflictNumber(0)
      }
    })()

    syncInFlightRef.current = run.finally(() => {
      syncInFlightRef.current = null
    })
    return syncInFlightRef.current
  }, [offlineOnly, user, onConflict])

  const syncStatusLabel = useMemo(() => {
    if (syncPhase === "conflict") {
      return "Choose a version in the dialog above"
    }
    if (syncing) {
      const last = syncLogEntries[syncLogEntries.length - 1]
      if (last) return last.step.replace(/ → (start|done|error)$/, "")
      return "Syncing…"
    }
    return ""
  }, [syncPhase, syncing, syncLogEntries])

  // No sync to wait for when offline or signed out; otherwise wait until this
  // user's first sync of the session has settled.
  const initialSyncComplete =
    offlineOnly || !user || completedSyncUid === user.uid

  const value = useMemo(
    () => ({
      syncing,
      syncPhase,
      syncStatusLabel,
      syncProgress,
      initialSyncComplete,
      syncLog: syncLogEntries,
      lastError,
      lastSyncedAt,
      syncNow,
      conflictActive: activeConflict != null,
    }),
    [
      syncing,
      syncPhase,
      syncStatusLabel,
      syncProgress,
      initialSyncComplete,
      syncLogEntries,
      lastError,
      lastSyncedAt,
      syncNow,
      activeConflict,
    ],
  )

  return (
    <Ctx.Provider value={value}>
      {children}
      {activeConflict && (
        <SyncConflictModal
          conflict={activeConflict}
          conflictNumber={conflictNumber}
          onChoose={handleConflictChoice}
        />
      )}
    </Ctx.Provider>
  )
}

export function useSync(): SyncState {
  const v = useContext(Ctx)
  if (!v) throw new Error("SyncProvider missing")
  return v
}
