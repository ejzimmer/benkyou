import { afterEach, describe, expect, it, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { db } from "./db/schema"
import { resetDatabase } from "../test/db"
import { useDebouncedQuery } from "./useDebouncedQuery"

afterEach(async () => {
  await resetDatabase()
})

describe("useDebouncedQuery", () => {
  it("returns the initial value without waiting for the debounce window", async () => {
    await db.decks.put({ id: "d1", name: "Deck one", updatedAt: Date.now() })

    const { result } = renderHook(() =>
      useDebouncedQuery(() => db.decks.toArray(), [], 300),
    )

    await waitFor(() => expect(result.current).toHaveLength(1))
  })

  it("coalesces a burst of individual writes into far fewer query runs", async () => {
    const querier = vi.fn(() => db.decks.toArray())

    const { result } = renderHook(() => useDebouncedQuery(querier, [], 50))
    await waitFor(() => expect(querier).toHaveBeenCalledTimes(1))

    // Simulate a sync writing one changed row at a time, in separate ticks.
    for (let i = 0; i < 20; i++) {
      await db.decks.put({ id: `d${i}`, name: `Deck ${i}`, updatedAt: Date.now() })
    }

    await waitFor(() => expect(result.current).toHaveLength(20))
    // Without coalescing this would be ~21 (1 initial + 1 per write).
    expect(querier.mock.calls.length).toBeLessThan(10)
  })

  it("settles on the accurate final value once a burst of writes quiets down", async () => {
    const { result } = renderHook(() =>
      useDebouncedQuery(() => db.decks.toArray(), [], 50),
    )
    await waitFor(() => expect(result.current).toHaveLength(0))

    for (let i = 0; i < 10; i++) {
      await db.decks.put({ id: `d${i}`, name: `Deck ${i}`, updatedAt: Date.now() })
    }

    await waitFor(() => expect(result.current).toHaveLength(10))
  })
})
