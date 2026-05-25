import { describe, expect, it } from "vitest"
import { tombstonePullDecision, tombstoneWins } from "./tombstonePolicy"
import type { Tombstone } from "./syncTypes"

const tomb = (deletedAt: number): Tombstone => ({
  id: "deck:x",
  entityType: "deck",
  entityId: "x",
  deletedAt,
})

describe("tombstonePolicy", () => {
  it("tombstoneWins when delete is newer than entity", () => {
    expect(tombstoneWins(tomb(5000), 3000)).toBe(true)
  })

  it("does not win when entity is newer than delete", () => {
    expect(tombstoneWins(tomb(1000), 5000)).toBe(false)
  })

  it("pulls entity when tombstone is stale", () => {
    expect(tombstonePullDecision(tomb(1000), 5000)).toBe("apply")
  })

  it("skips entity when tombstone is current", () => {
    expect(tombstonePullDecision(tomb(9000), 5000)).toBe("skip")
  })
})
