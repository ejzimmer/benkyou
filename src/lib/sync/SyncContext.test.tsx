import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { SyncProvider, useSync } from "./SyncContext"
import { clearSessionEdits, getSessionEditedCardIds, markCardEdited } from "./sessionEdits"

const runFullSync = vi.fn(async (..._args: unknown[]) => {})
const runPushOnly = vi.fn(async (..._args: unknown[]) => {})
const pushSessionEditsNow = vi.fn(async (..._args: unknown[]) => {})

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

vi.mock("../../services/decks", () => ({
  pushSessionEditsNow: (...args: unknown[]) => pushSessionEditsNow(...args),
}))

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

beforeEach(() => {
  runFullSync.mockClear().mockResolvedValue(undefined)
  runPushOnly.mockClear().mockResolvedValue(undefined)
  pushSessionEditsNow.mockClear().mockResolvedValue(undefined)
  clearSessionEdits()
})

afterEach(() => {
  clearSessionEdits()
})

describe("SyncContext pushNow", () => {
  it("calls runPushOnly, not runFullSync, and toggles syncing around it", async () => {
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

describe("SyncContext syncEditsNow", () => {
  it("calls pushSessionEditsNow with the current user", async () => {
    const { result } = renderHook(() => useSync(), { wrapper })
    await act(() => result.current.syncEditsNow())
    expect(pushSessionEditsNow).toHaveBeenCalledWith({ uid: "u1" })
  })

  it("shares the in-flight guard with syncNow, so a concurrent call joins rather than racing Firestore", async () => {
    let resolveFullSync!: () => void
    runFullSync.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveFullSync = resolve
        }),
    )
    const { result } = renderHook(() => useSync(), { wrapper })

    let syncPromise!: Promise<void>
    let editsPromise!: Promise<void>
    act(() => {
      syncPromise = result.current.syncNow()
      editsPromise = result.current.syncEditsNow()
    })

    await waitFor(() => expect(result.current.syncing).toBe(true))
    resolveFullSync()
    await act(async () => {
      await Promise.all([syncPromise, editsPromise])
    })

    expect(runFullSync).toHaveBeenCalledTimes(1)
    expect(pushSessionEditsNow).not.toHaveBeenCalled()
  })
})

describe("SyncContext idle sync", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("triggers a full sync after 5 minutes with no activity", async () => {
    renderHook(() => useSync(), { wrapper })

    await act(async () => {
      vi.advanceTimersByTime(5 * 60 * 1000)
    })

    expect(runFullSync).toHaveBeenCalledTimes(1)
  })

  it("does not fire before the idle timeout elapses", async () => {
    renderHook(() => useSync(), { wrapper })

    await act(async () => {
      vi.advanceTimersByTime(5 * 60 * 1000 - 1)
    })

    expect(runFullSync).not.toHaveBeenCalled()
  })
})

describe("SyncContext clears session edits only once a sync/push actually succeeds", () => {
  it("syncNow clears session edits after a successful full sync", async () => {
    markCardEdited("card-1")
    const { result } = renderHook(() => useSync(), { wrapper })
    await act(() => result.current.syncNow())
    expect(getSessionEditedCardIds()).toEqual([])
  })

  it("pushNow clears session edits after a successful push", async () => {
    markCardEdited("card-1")
    const { result } = renderHook(() => useSync(), { wrapper })
    await act(() => result.current.pushNow())
    expect(getSessionEditedCardIds()).toEqual([])
  })

  it("does not clear session edits when the sync throws", async () => {
    runFullSync.mockRejectedValueOnce(new Error("boom"))
    markCardEdited("card-1")
    const { result } = renderHook(() => useSync(), { wrapper })
    await act(async () => {
      await expect(result.current.syncNow()).rejects.toThrow("boom")
    })
    expect(getSessionEditedCardIds()).toEqual(["card-1"])
  })
})
