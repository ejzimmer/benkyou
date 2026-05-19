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
import { readLastSyncedAt, runFullSync } from "./runSync"
import type { SyncConflict, SyncConflictChoice } from "./syncTypes"

type SyncState = {
  syncing: boolean
  lastError: string | null
  lastSyncedAt: number | null
  syncNow: () => Promise<void>
  conflictActive: boolean
}

const Ctx = createContext<SyncState | null>(null)

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user, offlineOnly } = useAuth()
  const [syncing, setSyncing] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const [activeConflict, setActiveConflict] = useState<SyncConflict | null>(null)
  const conflictNumberRef = useRef(0)
  const [conflictNumber, setConflictNumber] = useState(0)

  useEffect(() => {
    setLastSyncedAt(readLastSyncedAt())
  }, [])

  const resolveRef = useRef<((choice: SyncConflictChoice) => void) | null>(null)

  const onConflict = useCallback((conflict: SyncConflict) => {
    return new Promise<SyncConflictChoice>((resolve) => {
      conflictNumberRef.current += 1
      setConflictNumber(conflictNumberRef.current)
      resolveRef.current = resolve
      setActiveConflict(conflict)
    })
  }, [])

  const handleConflictChoice = useCallback((choice: SyncConflictChoice) => {
    setActiveConflict(null)
    resolveRef.current?.(choice)
    resolveRef.current = null
  }, [])

  const syncNow = useCallback(async () => {
    if (offlineOnly || !user) return
    const fs = getFirestoreDb()
    const storage = getFirebaseStorage()
    if (!fs || !storage) return
    setSyncing(true)
    setLastError(null)
    conflictNumberRef.current = 0
    setConflictNumber(0)
    try {
      await runFullSync({
        fs,
        storage,
        uid: user.uid,
        onConflict,
      })
      setLastSyncedAt(Date.now())
    } catch (e) {
      setLastError(e instanceof Error ? e.message : String(e))
    } finally {
      setSyncing(false)
      setActiveConflict(null)
      conflictNumberRef.current = 0
      setConflictNumber(0)
    }
  }, [offlineOnly, user, onConflict])

  const value = useMemo(
    () => ({
      syncing,
      lastError,
      lastSyncedAt,
      syncNow,
      conflictActive: activeConflict != null,
    }),
    [syncing, lastError, lastSyncedAt, syncNow, activeConflict],
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
