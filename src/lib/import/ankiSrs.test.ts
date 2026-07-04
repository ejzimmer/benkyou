import { describe, expect, it } from "vitest"
import { ankiSchedulingToFsrs } from "./ankiSrs"
import { deserializeFsrs } from "../srs/schedule"
import type { AnkiSchedulingSource } from "./types"

function source(overrides: Partial<AnkiSchedulingSource>): AnkiSchedulingSource {
  return {
    id: 1,
    ord: 0,
    type: 2,
    queue: 2,
    due: 100,
    ivl: 10,
    factor: 2500,
    reps: 3,
    lapses: 0,
    isLeech: false,
    ...overrides,
  }
}

const ONE_YEAR_MS = 365 * 86_400_000

describe("ankiSchedulingToFsrs", () => {
  it("keeps a normal review card's real due date", () => {
    const card = deserializeFsrs(
      ankiSchedulingToFsrs(source({}), /* collectionCrt */ 0),
    )
    // Not pushed out to the far future.
    expect(card.due.getTime() - Date.now()).toBeLessThan(ONE_YEAR_MS)
  })

  it("schedules a suspended card (queue -1) far in the future instead of due now", () => {
    const card = deserializeFsrs(
      ankiSchedulingToFsrs(source({ queue: -1 }), 0),
    )
    expect(card.due.getTime() - Date.now()).toBeGreaterThan(50 * ONE_YEAR_MS)
  })

  it("schedules a leech-tagged card far in the future even if not suspended", () => {
    const card = deserializeFsrs(
      ankiSchedulingToFsrs(source({ queue: 2, isLeech: true }), 0),
    )
    expect(card.due.getTime() - Date.now()).toBeGreaterThan(50 * ONE_YEAR_MS)
  })

  it("still derives last_review from the real (not the pushed-out) due date for an ignored card", () => {
    const suspended = deserializeFsrs(
      ankiSchedulingToFsrs(source({ queue: -1, due: 100, ivl: 10 }), 1000),
    )
    const normal = deserializeFsrs(
      ankiSchedulingToFsrs(source({ queue: 2, due: 100, ivl: 10 }), 1000),
    )
    expect(suspended.last_review?.getTime()).toBe(normal.last_review?.getTime())
  })

  it("leaves a brand-new (non-suspended, non-leech) card due immediately", () => {
    const card = deserializeFsrs(
      ankiSchedulingToFsrs(
        source({ type: 0, queue: 0, due: 5, ivl: 0, reps: 0 }),
        0,
      ),
    )
    expect(card.due.getTime() - Date.now()).toBeLessThan(ONE_YEAR_MS)
  })
})
