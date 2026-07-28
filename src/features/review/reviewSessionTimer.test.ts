import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  decrementReviewedCount,
  getReviewedCount,
  getReviewSessionElapsedMs,
  incrementReviewedCount,
  pauseReviewSessionTimer,
  resumeReviewSessionTimerIfPresent,
  startReviewSessionTimer,
  unpauseReviewSessionTimer,
} from "./reviewSessionTimer"

function setNow(ms: number) {
  vi.spyOn(Date, "now").mockReturnValue(ms)
}

describe("reviewSessionTimer", () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("accumulates elapsed time while running", () => {
    setNow(0)
    startReviewSessionTimer("all")
    setNow(5_000)
    expect(getReviewSessionElapsedMs("all")).toBe(5_000)
  })

  it("stops accumulating once paused, and resumes counting from unpause", () => {
    setNow(0)
    startReviewSessionTimer("all")
    setNow(5_000)
    pauseReviewSessionTimer("all")
    setNow(60_000)
    expect(getReviewSessionElapsedMs("all")).toBe(5_000)

    unpauseReviewSessionTimer("all")
    setNow(63_000)
    expect(getReviewSessionElapsedMs("all")).toBe(8_000)
  })

  it("resumeReviewSessionTimerIfPresent picks up existing state instead of resetting it", () => {
    setNow(0)
    startReviewSessionTimer("deck-1")
    incrementReviewedCount("deck-1")
    setNow(10_000)
    pauseReviewSessionTimer("deck-1")

    const resumed = resumeReviewSessionTimerIfPresent("deck-1")

    expect(resumed).toBe(true)
    expect(getReviewedCount("deck-1")).toBe(1)
    setNow(12_000)
    expect(getReviewSessionElapsedMs("deck-1")).toBe(12_000)
  })

  it("resumeReviewSessionTimerIfPresent returns false when nothing was stored", () => {
    expect(resumeReviewSessionTimerIfPresent("never-started")).toBe(false)
  })

  it("starting a new timer for a scope replaces any prior state", () => {
    setNow(0)
    startReviewSessionTimer("all")
    incrementReviewedCount("all")
    setNow(30_000)

    startReviewSessionTimer("all")

    expect(getReviewedCount("all")).toBe(0)
    expect(getReviewSessionElapsedMs("all")).toBe(0)
  })

  it("tracks reviewed count independently per scope, and floors decrements at zero", () => {
    startReviewSessionTimer("all")
    startReviewSessionTimer("deck-2")
    incrementReviewedCount("all")
    incrementReviewedCount("all")

    expect(getReviewedCount("all")).toBe(2)
    expect(getReviewedCount("deck-2")).toBe(0)

    decrementReviewedCount("all")
    decrementReviewedCount("all")
    decrementReviewedCount("all")

    expect(getReviewedCount("all")).toBe(0)
  })
})
