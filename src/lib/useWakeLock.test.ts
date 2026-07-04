import { afterEach, describe, expect, it, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { useWakeLock } from "./useWakeLock"

function mockWakeLock(request: (type: "screen") => Promise<WakeLockSentinel>) {
  Object.defineProperty(navigator, "wakeLock", {
    value: { request },
    configurable: true,
  })
}

function fakeSentinel(): WakeLockSentinel {
  return {
    released: false,
    type: "screen",
    release: vi.fn().mockResolvedValue(undefined),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onrelease: null,
  } as unknown as WakeLockSentinel
}

afterEach(() => {
  Reflect.deleteProperty(navigator, "wakeLock")
  vi.restoreAllMocks()
})

describe("useWakeLock", () => {
  it("reports unsupported when the Wake Lock API doesn't exist", () => {
    const { result } = renderHook(() => useWakeLock(true))
    expect(result.current).toBe("unsupported")
  })

  it("stays idle when not active", () => {
    const { result } = renderHook(() => useWakeLock(false))
    expect(result.current).toBe("idle")
  })

  it("requests a screen wake lock and reports active once granted", async () => {
    const sentinel = fakeSentinel()
    const request = vi.fn().mockResolvedValue(sentinel)
    mockWakeLock(request)

    const { result } = renderHook(() => useWakeLock(true))
    await waitFor(() => expect(result.current).toBe("active"))
    expect(request).toHaveBeenCalledWith("screen")
  })

  it("reports unavailable when the request is rejected", async () => {
    mockWakeLock(vi.fn().mockRejectedValue(new Error("nope")))

    const { result } = renderHook(() => useWakeLock(true))
    await waitFor(() => expect(result.current).toBe("unavailable"))
  })

  it("releases the lock once active turns false", async () => {
    const sentinel = fakeSentinel()
    mockWakeLock(vi.fn().mockResolvedValue(sentinel))

    const { result, rerender } = renderHook(
      ({ active }) => useWakeLock(active),
      { initialProps: { active: true } },
    )
    await waitFor(() => expect(result.current).toBe("active"))

    rerender({ active: false })
    expect(result.current).toBe("idle")
    await waitFor(() => expect(sentinel.release).toHaveBeenCalled())
  })
})
