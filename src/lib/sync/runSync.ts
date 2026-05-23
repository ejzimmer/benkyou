import type { Firestore } from "firebase/firestore"
import type { FirebaseStorage } from "firebase/storage"
import { db, type MediaRow } from "../db/schema"
import {
  cardChanged,
  cardSummary,
  deckChanged,
  deckSummary,
  mediaChanged,
  mediaSummary,
  resolveByTimestamp,
  schedulingChanged,
  schedulingSummary,
  mediaBlobDigest,
} from "./syncCompare"
import {
  fetchRemoteSnapshot,
  pushLocalToRemote,
  type RemoteSnapshot,
} from "./firestoreSync"
import {
  downloadMediaBlob,
  mediaPreviewUrl,
  uploadMediaBlob,
} from "./mediaSync"
import { purgeTombstonedMediaStorage } from "./purgeMediaStorage"
import { tombstoneId } from "./syncCompare"
import type { SyncConflict, SyncConflictChoice, Tombstone } from "./syncTypes"
import { LAST_SYNCED_AT_KEY } from "./syncTypes"
import { syncLog, syncLogTimed } from "./syncLog"

export type RunSyncOptions = {
  fs: Firestore
  storage: FirebaseStorage
  uid: string
  onConflict: (conflict: SyncConflict) => Promise<SyncConflictChoice>
}

function tombstoneWins(
  tomb: Tombstone | undefined,
  entityUpdatedAt: number | undefined,
): boolean {
  if (!tomb) return false
  if (entityUpdatedAt == null) return true
  return tomb.deletedAt >= entityUpdatedAt
}

async function applyRemoteTombstones(
  remote: RemoteSnapshot,
  localTombs: Tombstone[],
): Promise<void> {
  const allTombs = new Map<string, Tombstone>()
  for (const t of localTombs) allTombs.set(t.id, t)
  for (const t of remote.tombstones.values()) {
    const existing = allTombs.get(t.id)
    if (!existing || t.deletedAt >= existing.deletedAt) allTombs.set(t.id, t)
  }

  await db.transaction(
    "rw",
    [db.decks, db.cards, db.scheduling, db.media, db.tombstones],
    async () => {
      for (const t of allTombs.values()) {
        await db.tombstones.put(t)
        if (t.entityType === "deck") {
          const deck = await db.decks.get(t.entityId)
          if (tombstoneWins(t, deck?.updatedAt)) await db.decks.delete(t.entityId)
        } else if (t.entityType === "card") {
          const card = await db.cards.get(t.entityId)
          if (tombstoneWins(t, card?.updatedAt)) {
            await db.cards.delete(t.entityId)
            await db.scheduling.where("cardId").equals(t.entityId).delete()
          }
        } else if (t.entityType === "scheduling") {
          const row = await db.scheduling.get(t.entityId)
          if (tombstoneWins(t, row?.updatedAt))
            await db.scheduling.delete(t.entityId)
        } else if (t.entityType === "media") {
          const row = await db.media.get(t.entityId)
          if (tombstoneWins(t, row?.updatedAt)) await db.media.delete(t.entityId)
        }
      }
    },
  )
}

async function collectEntityConflicts(
  lastSyncedAt: number | null,
  remote: RemoteSnapshot,
  onConflict: (c: SyncConflict) => Promise<SyncConflictChoice>,
): Promise<void> {
  const localDecks = await db.decks.toArray()
  const localCards = await db.cards.toArray()
  const localSched = await db.scheduling.toArray()

  for (const local of localDecks) {
    if (await db.tombstones.get(tombstoneId("deck", local.id))) continue
    const remoteDeck = remote.decks.get(local.id)
    if (!remoteDeck) continue
    const changed = deckChanged(local, remoteDeck)
    const pick = resolveByTimestamp(local, remoteDeck, lastSyncedAt, changed)
    if (pick === "conflict") {
      syncLog("merge conflict", { entityType: "deck", entityId: local.id })
      const choice = await onConflict({
        key: `deck:${local.id}`,
        entityType: "deck",
        entityId: local.id,
        localUpdatedAt: local.updatedAt,
        remoteUpdatedAt: remoteDeck.updatedAt,
        localSummary: deckSummary(local),
        remoteSummary: deckSummary(remoteDeck),
        local,
        remote: remoteDeck,
      })
      await db.decks.put(choice === "local" ? local : remoteDeck)
    } else {
      await db.decks.put(pick === "local" ? local : remoteDeck)
    }
  }

  for (const remoteDeck of remote.decks.values()) {
    if (await db.tombstones.get(tombstoneId("deck", remoteDeck.id))) continue
    if (await db.decks.get(remoteDeck.id)) continue
    await db.decks.put(remoteDeck)
  }

  for (const local of localCards) {
    if (await db.tombstones.get(tombstoneId("card", local.id))) continue
    const remoteCard = remote.cards.get(local.id)
    if (!remoteCard) continue
    const changed = cardChanged(local, remoteCard)
    const pick = resolveByTimestamp(local, remoteCard, lastSyncedAt, changed)
    if (pick === "conflict") {
      syncLog("merge conflict", { entityType: "card", entityId: local.id })
      const choice = await onConflict({
        key: `card:${local.id}`,
        entityType: "card",
        entityId: local.id,
        localUpdatedAt: local.updatedAt,
        remoteUpdatedAt: remoteCard.updatedAt,
        localSummary: cardSummary(local),
        remoteSummary: cardSummary(remoteCard),
        local,
        remote: remoteCard,
      })
      await db.cards.put(choice === "local" ? local : remoteCard)
    } else {
      await db.cards.put(pick === "local" ? local : remoteCard)
    }
  }

  for (const remoteCard of remote.cards.values()) {
    if (await db.tombstones.get(tombstoneId("card", remoteCard.id))) continue
    if (await db.cards.get(remoteCard.id)) continue
    await db.cards.put(remoteCard)
  }

  for (const local of localSched) {
    if (await db.tombstones.get(tombstoneId("scheduling", local.id))) continue
    const remoteRow = remote.scheduling.get(local.id)
    if (!remoteRow) continue
    const changed = schedulingChanged(local, remoteRow)
    const pick = resolveByTimestamp(local, remoteRow, lastSyncedAt, changed)
    if (pick === "conflict") {
      syncLog("merge conflict", {
        entityType: "scheduling",
        entityId: local.id,
      })
      const choice = await onConflict({
        key: `scheduling:${local.id}`,
        entityType: "scheduling",
        entityId: local.id,
        localUpdatedAt: local.updatedAt,
        remoteUpdatedAt: remoteRow.updatedAt,
        localSummary: schedulingSummary(local),
        remoteSummary: schedulingSummary(remoteRow),
        local,
        remote: remoteRow,
      })
      await db.scheduling.put(choice === "local" ? local : remoteRow)
    } else {
      await db.scheduling.put(pick === "local" ? local : remoteRow)
    }
  }

  for (const remoteRow of remote.scheduling.values()) {
    if (await db.tombstones.get(tombstoneId("scheduling", remoteRow.id))) continue
    if (await db.scheduling.get(remoteRow.id)) continue
    await db.scheduling.put(remoteRow)
  }
}

async function syncMedia(
  storage: FirebaseStorage,
  uid: string,
  remote: RemoteSnapshot,
  lastSyncedAt: number | null,
  onConflict: (c: SyncConflict) => Promise<SyncConflictChoice>,
): Promise<void> {
  const cards = await db.cards.toArray()
  const referenced = new Set<string>()
  for (const c of cards) {
    for (const id of c.content.images) referenced.add(id)
  }

  const localMedia = await db.media.toArray()
  const localById = new Map(localMedia.map((m) => [m.id, m]))

  for (const mediaId of referenced) {
    if (await db.tombstones.get(tombstoneId("media", mediaId))) continue

    const local = localById.get(mediaId)
    const remoteMeta = remote.mediaMeta.get(mediaId)

    if (local && remoteMeta) {
      const localDigest = await mediaBlobDigest(local.blob)
      let remoteRow: MediaRow
      try {
        remoteRow = await downloadMediaBlob(storage, uid, remoteMeta)
      } catch {
        if (local) await uploadMediaBlob(storage, uid, local)
        continue
      }
      const remoteDigest = await mediaBlobDigest(remoteRow.blob)
      const changed = mediaChanged(local, remoteMeta, localDigest, remoteDigest)
      const pick = resolveByTimestamp(
        { updatedAt: local.updatedAt },
        { updatedAt: remoteMeta.updatedAt },
        lastSyncedAt,
        changed,
      )
      if (pick === "conflict") {
        syncLog("merge conflict", { entityType: "media", entityId: mediaId })
        const localUrl = mediaPreviewUrl(local)
        const remoteUrl = mediaPreviewUrl(remoteRow)
        try {
          const choice = await onConflict({
            key: `media:${mediaId}`,
            entityType: "media",
            entityId: mediaId,
            localUpdatedAt: local.updatedAt,
            remoteUpdatedAt: remoteMeta.updatedAt,
            localSummary: mediaSummary(local),
            remoteSummary: mediaSummary(remoteMeta),
            local,
            remote: remoteRow,
            localPreviewUrl: localUrl,
            remotePreviewUrl: remoteUrl,
          })
          await db.media.put(choice === "local" ? local : remoteRow)
          await uploadMediaBlob(
            storage,
            uid,
            choice === "local" ? local : remoteRow,
          )
        } finally {
          URL.revokeObjectURL(localUrl)
          URL.revokeObjectURL(remoteUrl)
        }
      } else if (pick === "remote") {
        await db.media.put(remoteRow)
      } else {
        await uploadMediaBlob(storage, uid, local)
      }
      continue
    }

    if (local && !remoteMeta) {
      await uploadMediaBlob(storage, uid, local)
      continue
    }

    if (!local && remoteMeta) {
      try {
        const remoteRow = await downloadMediaBlob(storage, uid, remoteMeta)
        await db.media.put(remoteRow)
      } catch {
        /* missing storage object */
      }
    }
  }

}

export function readLastSyncedAt(): number | null {
  const raw = localStorage.getItem(LAST_SYNCED_AT_KEY)
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

export function writeLastSyncedAt(ts: number): void {
  localStorage.setItem(LAST_SYNCED_AT_KEY, ts.toString())
}

export async function runFullSync(options: RunSyncOptions): Promise<void> {
  const { fs, storage, uid, onConflict } = options
  syncLog("runFullSync start", { uid, lastSyncedAt: readLastSyncedAt() })
  const lastSyncedAt = readLastSyncedAt()

  const remote = await syncLogTimed("pull remote snapshot", () =>
    fetchRemoteSnapshot(fs, uid, "sync"),
  )
  const localTombs = await db.tombstones.toArray()

  await syncLogTimed("apply remote tombstones", () =>
    applyRemoteTombstones(remote, localTombs),
  )
  await syncLogTimed("merge decks/cards/scheduling", () =>
    collectEntityConflicts(lastSyncedAt, remote, onConflict),
  )

  await syncLogTimed("sync media blobs", () =>
    syncMedia(storage, uid, remote, lastSyncedAt, onConflict),
  )

  await syncLogTimed("push local to remote", () =>
    pushLocalToRemote(fs, uid, remote),
  )

  const localMedia = await db.media.toArray()
  syncLog("upload media pass", { count: localMedia.length })
  for (const m of localMedia) {
    if (await db.tombstones.get(tombstoneId("media", m.id))) continue
    try {
      await syncLogTimed(`upload media ${m.id}`, () =>
        uploadMediaBlob(storage, uid, m),
      )
    } catch (e) {
      syncLog("upload media skipped", {
        id: m.id,
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  await syncLogTimed("purge tombstoned media in Storage", () =>
    purgeTombstonedMediaStorage(storage, uid),
  )

  writeLastSyncedAt(Date.now())
  syncLog("runFullSync complete")
}

/** Push local changes without merge (after edits while signed in). */
export async function runPushOnly(
  fs: Firestore,
  storage: FirebaseStorage,
  uid: string,
): Promise<void> {
  await pushLocalToRemote(fs, uid)
  const localMedia = await db.media.toArray()
  for (const m of localMedia) {
    if (await db.tombstones.get(tombstoneId("media", m.id))) continue
    try {
      await uploadMediaBlob(storage, uid, m)
    } catch {
      /* ignore */
    }
  }
  await purgeTombstonedMediaStorage(storage, uid)
}
