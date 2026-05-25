import { beforeEach, describe, expect, it, vi } from "vitest"
import { db } from "../lib/db/schema"
import { createDeck } from "./decks"
import { resetDatabase } from "../test/db"
import { clearLocalCacheOnly } from "./localCache"
import {
  isPullOnlySyncPending,
  LAST_SYNCED_AT_KEY,
  PULL_ONLY_SYNC_KEY,
} from "../lib/sync/syncTypes"

vi.mock("../lib/firebase", () => ({
  getFirebaseApp: () => null,
  getFirestoreDb: () => null,
  isFirebaseConfigured: () => false,
}))

describe("clearLocalCacheOnly", () => {
  beforeEach(async () => {
    await resetDatabase()
    localStorage.clear()
  })

  it("removes local decks and sets pull-only sync", async () => {
    await createDeck("Test deck", null)
    localStorage.setItem(LAST_SYNCED_AT_KEY, "12345")

    await clearLocalCacheOnly()

    expect(await db.decks.count()).toBe(0)
    expect(await db.cards.count()).toBe(0)
    expect(await db.media.count()).toBe(0)
    expect(await db.tombstones.count()).toBe(0)
    expect(localStorage.getItem(LAST_SYNCED_AT_KEY)).toBeNull()
    expect(localStorage.getItem(PULL_ONLY_SYNC_KEY)).toBe("1")
    expect(isPullOnlySyncPending()).toBe(true)
  })
})
