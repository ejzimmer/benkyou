import { describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { SyncProvider, useSync } from "./SyncContext"

const runFullSync = vi.fn(async (..._args: unknown[]) => {})
const runPushOnly = vi.fn(async (..._args: unknown[]) => {})

vi.mock("./runSync", async () => {
  const actual =
    await vi.importActual<typeof import("./runSync")>("./runSync")
  return {
    ...actual,
    readLastSyncedAt: () => null,
    runFullSync: (...args: unknown[]) => runFullSync(...args),
    runPushOnly: (...args: unknown[]) => runPushOnly(...args),
  }
})

vi.mock("../firebase", () => ({
  getFirestoreDb: () => ({}),
  getFirebaseStorage: () => ({}),
}))

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "u1" }, offlineOnly: false }),
}))

function wrapper({ children }: { children: ReactNode }) {
  return <SyncProvider>{children}</SyncProvider>
}

describe("SyncContext pushNow", () => {
  it("calls runPushOnly, not runFullSync, and toggles syncing around it", async () => {
    runFullSync.mockClear()
    runPushOnly.mockClear()
    const { result } = renderHook(() => useSync(), { wrapper })

    let pushPromise!: Promise<void>
    act(() => {
      pushPromise = result.current.pushNow()
    })

    await waitFor(() => expect(result.current.syncing).toBe(true))
    await act(() => pushPromise)

    expect(runPushOnly).toHaveBeenCalledTimes(1)
    expect(runPushOnly).toHaveBeenCalledWith(expect.anything(), expect.anything(), "u1")
    expect(runFullSync).not.toHaveBeenCalled()
    expect(result.current.syncing).toBe(false)
  })

  it("joins an in-flight sync/push instead of starting a second one", async () => {
    runFullSync.mockClear()
    runPushOnly.mockClear()
    let resolveFullSync!: () => void
    runFullSync.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveFullSync = resolve
        }),
    )
    const { result } = renderHook(() => useSync(), { wrapper })

    let syncPromise!: Promise<void>
    let pushPromise!: Promise<void>
    act(() => {
      syncPromise = result.current.syncNow()
      pushPromise = result.current.pushNow()
    })

    await waitFor(() => expect(result.current.syncing).toBe(true))
    resolveFullSync()
    await act(async () => {
      await Promise.all([syncPromise, pushPromise])
    })

    expect(runFullSync).toHaveBeenCalledTimes(1)
    expect(runPushOnly).not.toHaveBeenCalled()
  })
})
