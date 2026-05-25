import { beforeEach, describe, expect, it } from "vitest"
import { db } from "../db/schema"
import type { Deck } from "../../domain/types"
import { resetDatabase } from "../../test/db"
import { collectEntityConflicts } from "./runSync"
import type { RemoteSnapshot } from "./firestoreSync"
import { recordTombstone } from "./tombstones"
import { tombstoneId } from "./syncCompare"

function emptyRemote(): RemoteSnapshot {
  return {
    decks: new Map(),
    cards: new Map(),
    scheduling: new Map(),
    tombstones: new Map(),
    mediaMeta: new Map(),
  }
}

describe("collectEntityConflicts remote pull", () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it("adds remote deck on empty device when tombstone is older than deck", async () => {
    const remoteDeck: Deck = {
      id: "deck-imported",
      name: "From phone",
      updatedAt: 10_000,
    }
    await recordTombstone("deck", remoteDeck.id, 1000)

    const remote: RemoteSnapshot = {
      ...emptyRemote(),
      decks: new Map([[remoteDeck.id, remoteDeck]]),
    }

    await collectEntityConflicts(null, remote, async () => "remote")

    expect(await db.decks.get(remoteDeck.id)).toEqual(remoteDeck)
    expect(
      await db.tombstones.get(tombstoneId("deck", remoteDeck.id)),
    ).toBeUndefined()
  })

  it("skips remote deck when tombstone is newer than deck", async () => {
    const remoteDeck: Deck = {
      id: "deck-deleted",
      name: "Gone",
      updatedAt: 1000,
    }
    await recordTombstone("deck", remoteDeck.id, 9000)

    const remote: RemoteSnapshot = {
      ...emptyRemote(),
      decks: new Map([[remoteDeck.id, remoteDeck]]),
    }

    await collectEntityConflicts(null, remote, async () => "remote")

    expect(await db.decks.get(remoteDeck.id)).toBeUndefined()
  })
})
