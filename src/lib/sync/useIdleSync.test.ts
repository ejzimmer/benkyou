import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import { useIdleSync } from "./useIdleSync"

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("useIdleSync", () => {
  it("fires onIdle after the timeout with no activity", () => {
    const onIdle = vi.fn()
    renderHook(() => useIdleSync(true, onIdle, 5000))

    vi.advanceTimersByTime(4999)
    expect(onIdle).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(onIdle).toHaveBeenCalledTimes(1)
  })

  it("does nothing when disabled", () => {
    const onIdle = vi.fn()
    renderHook(() => useIdleSync(false, onIdle, 5000))

    vi.advanceTimersByTime(10000)
    expect(onIdle).not.toHaveBeenCalled()
  })

  it("resets the timer on activity, delaying the fire", () => {
    const onIdle = vi.fn()
    renderHook(() => useIdleSync(true, onIdle, 5000))

    vi.advanceTimersByTime(4000)
    window.dispatchEvent(new Event("keydown"))
    vi.advanceTimersByTime(4000)
    expect(onIdle).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1000)
    expect(onIdle).toHaveBeenCalledTimes(1)
  })

  it("waits for the next activity before firing again", () => {
    const onIdle = vi.fn()
    renderHook(() => useIdleSync(true, onIdle, 5000))

    vi.advanceTimersByTime(5000)
    expect(onIdle).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(20000)
    expect(onIdle).toHaveBeenCalledTimes(1)

    window.dispatchEvent(new Event("mousemove"))
    vi.advanceTimersByTime(5000)
    expect(onIdle).toHaveBeenCalledTimes(2)
  })

  it("stops listening on unmount", () => {
    const onIdle = vi.fn()
    const { unmount } = renderHook(() => useIdleSync(true, onIdle, 5000))

    unmount()
    vi.advanceTimersByTime(10000)
    expect(onIdle).not.toHaveBeenCalled()
  })
})
