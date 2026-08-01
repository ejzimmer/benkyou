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
import {
  readLastSyncedAt,
  runFullSync,
  runPushOnly,
  type SyncProgress,
} from "./runSync"
import {
  clearSyncLog,
  getSyncLogEntries,
  subscribeSyncLog,
  syncLog,
  type SyncLogEntry,
} from "./syncLog"
import { clearSessionEdits } from "./sessionEdits"
import { pushSessionEditsNow } from "../../services/decks"
import type { SyncConflict, SyncConflictChoice } from "./syncTypes"

export type SyncPhase = "idle" | "running" | "conflict"

type SyncState = {
  syncing: boolean
  syncPhase: SyncPhase
  syncProgress: SyncProgress | null
  syncLog: readonly SyncLogEntry[]
  lastError: string | null
  lastSyncedAt: number | null
  /** Two-way merge sync: pulls remote changes and pushes local ones, with conflict resolution. */
  syncNow: () => Promise<void>
  /** Push-only: uploads local changes without pulling or resolving conflicts. */
  pushNow: () => Promise<void>
  /** Force-pushes just the cards edited/created this session, no merge. */
  syncEditsNow: () => Promise<void>
  conflictActive: boolean
  /**
   * Bumped once a sync that hit at least one conflict has settled. A review
   * session watches this to reload its queue with the resolved data — the
   * card/scheduling row it's holding may have just been overwritten.
   */
  conflictResolutionVersion: number
}

const Ctx = createContext<SyncState | null>(null)

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user, offlineOnly } = useAuth()
  const [syncing, setSyncing] = useState(false)
  const [syncPhase, setSyncPhase] = useState<SyncPhase>("idle")
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const [activeConflict, setActiveConflict] = useState<SyncConflict | null>(null)
  const [syncLogEntries, setSyncLogEntries] = useState<readonly SyncLogEntry[]>(
    () => getSyncLogEntries(),
  )
  const conflictNumberRef = useRef(0)
  const [conflictResolutionVersion, setConflictResolutionVersion] = useState(0)

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

  // Shared across syncNow/pushNow/syncEditsNow so they can't run concurrently
  // against Firestore — calling one while another is already in flight just
  // joins it.
  const operationInFlightRef = useRef<Promise<void> | null>(null)

  const syncNow = useCallback(async () => {
    if (offlineOnly || !user) {
      syncLog("sync skipped", { offlineOnly, hasUser: Boolean(user) })
      return
    }
    if (operationInFlightRef.current) {
      syncLog("sync already in flight — joining existing run")
      return operationInFlightRef.current
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
        return
      }
      setSyncing(true)
      setSyncPhase("running")
      setSyncProgress(null)
      setLastError(null)
      conflictNumberRef.current = 0
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
        // A full sync pushes every local-only/local-newer card, so nothing
        // this session edited is still pending afterward.
        clearSessionEdits()
        syncLog("syncNow finished OK")
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        syncLog("syncNow failed", { error: msg })
        setLastError(msg)
        throw e
      } finally {
        const hadConflict = conflictNumberRef.current > 0
        setSyncing(false)
        setSyncPhase("idle")
        setSyncProgress(null)
        setActiveConflict(null)
        conflictNumberRef.current = 0
        // Conflict resolution can overwrite the card/scheduling row an active
        // review session is holding — bump so it knows to reload its queue.
        if (hadConflict) setConflictResolutionVersion((v) => v + 1)
      }
    })()

    operationInFlightRef.current = run.finally(() => {
      operationInFlightRef.current = null
    })
    return operationInFlightRef.current
  }, [offlineOnly, user, onConflict])

  const pushNow = useCallback(async () => {
    if (offlineOnly || !user) {
      syncLog("push skipped", { offlineOnly, hasUser: Boolean(user) })
      return
    }
    if (operationInFlightRef.current) {
      syncLog("push already in flight — joining existing run")
      return operationInFlightRef.current
    }

    const run = (async () => {
      clearSyncLog()
      syncLog("pushNow invoked", { uid: user.uid })
      const fs = getFirestoreDb()
      const storage = getFirebaseStorage()
      if (!fs || !storage) {
        syncLog("push aborted: Firebase not ready", {
          hasFirestore: Boolean(fs),
          hasStorage: Boolean(storage),
        })
        return
      }
      setSyncing(true)
      setSyncPhase("running")
      setLastError(null)
      try {
        await runPushOnly(fs, storage, user.uid)
        // Push-only uploads every local-only/local-newer card too, so
        // nothing this session edited is still pending afterward.
        clearSessionEdits()
        syncLog("pushNow finished OK")
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        syncLog("pushNow failed", { error: msg })
        setLastError(msg)
        throw e
      } finally {
        setSyncing(false)
        setSyncPhase("idle")
      }
    })()

    operationInFlightRef.current = run.finally(() => {
      operationInFlightRef.current = null
    })
    return operationInFlightRef.current
  }, [offlineOnly, user])

  const syncEditsNow = useCallback(async () => {
    if (offlineOnly || !user) {
      syncLog("sync edits skipped", { offlineOnly, hasUser: Boolean(user) })
      return
    }
    if (operationInFlightRef.current) {
      syncLog("sync edits already in flight — joining existing run")
      return operationInFlightRef.current
    }

    const run = (async () => {
      clearSyncLog()
      syncLog("syncEditsNow invoked", { uid: user.uid })
      const fs = getFirestoreDb()
      const storage = getFirebaseStorage()
      if (!fs || !storage) {
        syncLog("sync edits aborted: Firebase not ready", {
          hasFirestore: Boolean(fs),
          hasStorage: Boolean(storage),
        })
        return
      }
      setSyncing(true)
      setSyncPhase("running")
      setLastError(null)
      try {
        // pushSessionEditsNow clears the specific cards it pushed itself,
        // once it's confirmed they actually went out.
        await pushSessionEditsNow(user)
        syncLog("syncEditsNow finished OK")
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        syncLog("syncEditsNow failed", { error: msg })
        setLastError(msg)
        throw e
      } finally {
        setSyncing(false)
        setSyncPhase("idle")
      }
    })()

    operationInFlightRef.current = run.finally(() => {
      operationInFlightRef.current = null
    })
    return operationInFlightRef.current
  }, [offlineOnly, user])

  const value = useMemo(
    () => ({
      syncing,
      syncPhase,
      syncProgress,
      syncLog: syncLogEntries,
      lastError,
      lastSyncedAt,
      syncNow,
      pushNow,
      syncEditsNow,
      conflictActive: activeConflict != null,
      conflictResolutionVersion,
    }),
    [
      syncing,
      syncPhase,
      syncProgress,
      syncLogEntries,
      lastError,
      lastSyncedAt,
      syncNow,
      pushNow,
      syncEditsNow,
      activeConflict,
      conflictResolutionVersion,
    ],
  )

  return (
    <Ctx.Provider value={value}>
      {children}
      {activeConflict && (
        <SyncConflictModal
          conflict={activeConflict}
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
