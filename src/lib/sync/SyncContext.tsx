import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useAuth } from "../auth/AuthContext"
import { getFirestoreDb } from "../firebase"
import { pullRemoteToLocal, pushLocalToRemote } from "./firestoreSync"

type SyncState = {
  syncing: boolean
  lastError: string | null
  lastSyncedAt: number | null
  syncNow: () => Promise<void>
}

const Ctx = createContext<SyncState | null>(null)

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user, offlineOnly } = useAuth()
  const [syncing, setSyncing] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)

  const syncNow = useCallback(async () => {
    if (offlineOnly || !user) return
    const fs = getFirestoreDb()
    if (!fs) return
    setSyncing(true)
    setLastError(null)
    try {
      await pullRemoteToLocal(fs, user.uid)
      await pushLocalToRemote(fs, user.uid)
      setLastSyncedAt(Date.now())
    } catch (e) {
      setLastError(e instanceof Error ? e.message : String(e))
    } finally {
      setSyncing(false)
    }
  }, [offlineOnly, user])

  const value = useMemo(
    () => ({
      syncing,
      lastError,
      lastSyncedAt,
      syncNow,
    }),
    [syncing, lastError, lastSyncedAt, syncNow],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSync(): SyncState {
  const v = useContext(Ctx)
  if (!v) throw new Error("SyncProvider missing")
  return v
}
