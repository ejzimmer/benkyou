import { describe, expect, it } from "vitest"
import { mergeTombstone } from "./tombstoneMerge"
import type { Tombstone } from "./syncTypes"

const base = (over: Partial<Tombstone> = {}): Tombstone => ({
  id: "media:x",
  entityType: "media",
  entityId: "x",
  deletedAt: 100,
  ...over,
})

describe("mergeTombstone", () => {
  it("keeps storagePurgedAt from local when remote wins on deletedAt", () => {
    const local = base({ deletedAt: 50, storagePurgedAt: 999 })
    const remote = base({ deletedAt: 200 })
    const merged = mergeTombstone(local, remote)
    expect(merged.deletedAt).toBe(200)
    expect(merged.storagePurgedAt).toBe(999)
  })

  it("keeps storagePurgedAt from remote when local wins on deletedAt", () => {
    const local = base({ deletedAt: 300 })
    const remote = base({ deletedAt: 100, storagePurgedAt: 888 })
    const merged = mergeTombstone(local, remote)
    expect(merged.deletedAt).toBe(300)
    expect(merged.storagePurgedAt).toBe(888)
  })
})
