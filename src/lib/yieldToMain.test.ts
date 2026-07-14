import { afterEach, describe, expect, it, vi } from "vitest"
import { yieldPeriodically, yieldToMain } from "./yieldToMain"

describe("yieldToMain", () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "scheduler")
  })

  it("uses scheduler.yield() when available", async () => {
    const schedulerYield = vi.fn().mockResolvedValue(undefined)
    ;(globalThis as { scheduler?: unknown }).scheduler = { yield: schedulerYield }

    await yieldToMain()

    expect(schedulerYield).toHaveBeenCalledTimes(1)
  })

  it("falls back to setTimeout when scheduler.yield isn't available", async () => {
    await expect(yieldToMain()).resolves.toBeUndefined()
  })
})

describe("yieldPeriodically", () => {
  it("only yields every chunkSize iterations, not on i === 0", async () => {
    const schedulerYield = vi.fn().mockResolvedValue(undefined)
    ;(globalThis as { scheduler?: unknown }).scheduler = { yield: schedulerYield }

    for (let i = 0; i < 10; i++) {
      await yieldPeriodically(i, 5)
    }

    // Should yield at i=5 only (i=0 is skipped, i=10 would be next but the
    // loop stops at 9).
    expect(schedulerYield).toHaveBeenCalledTimes(1)

    Reflect.deleteProperty(globalThis, "scheduler")
  })
})
