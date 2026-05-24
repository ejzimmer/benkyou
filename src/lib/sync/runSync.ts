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
  resolveEntityMerge,
  schedulingChanged,
  schedulingSummary,
  summariesLookIdentical,
  mediaBlobDigest,
} from "./syncCompare"
import {
  fetchRemoteSnapshot,
  pushLocalToRemote,
  type RemoteSnapshot,
} from "./firestoreSync"
import {
  downloadMediaBlob,
  hydrateReferencedMedia,
  mediaPreviewUrl,
  uploadMediaBlob,
} from "./mediaSync"
import { purgeTombstonedMediaStorage } from "./purgeMediaStorage"
import { runWithConcurrency } from "./runWithConcurrency"
import { mergeTombstone } from "./tombstoneMerge"
import { pruneOrphanMediaTombstones } from "./tombstones"
import { tombstoneId } from "./syncCompare"
import {
  LAST_SYNCED_AT_KEY,
  type SyncConflict,
  type SyncConflictChoice,
  type Tombstone,
} from "./syncTypes"
import { syncLog, syncLogTimed } from "./syncLog"

async function resolveConflictChoice(
  conflict: SyncConflict,
  onConflict: (c: SyncConflict) => Promise<SyncConflictChoice>,
): Promise<SyncConflictChoice> {
  if (summariesLookIdentical(conflict.localSummary, conflict.remoteSummary)) {
    syncLog("auto-resolved conflict (identical summary)", {
      entityType: conflict.entityType,
      entityId: conflict.entityId,
    })
    return conflict.localUpdatedAt >= conflict.remoteUpdatedAt
      ? "local"
      : "remote"
  }
  return onConflict(conflict)
}

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
    allTombs.set(t.id, mergeTombstone(existing, t))
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
    const pick = resolveEntityMerge(
      local,
      remoteDeck,
      lastSyncedAt,
      !deckChanged(local, remoteDeck),
    )
    if (pick === "conflict") {
      syncLog("merge conflict", { entityType: "deck", entityId: local.id })
      const choice = await resolveConflictChoice(
        {
          key: `deck:${local.id}`,
          entityType: "deck",
          entityId: local.id,
          localUpdatedAt: local.updatedAt,
          remoteUpdatedAt: remoteDeck.updatedAt,
          localSummary: deckSummary(local),
          remoteSummary: deckSummary(remoteDeck),
          local,
          remote: remoteDeck,
        },
        onConflict,
      )
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
    const pick = resolveEntityMerge(
      local,
      remoteCard,
      lastSyncedAt,
      !cardChanged(local, remoteCard),
    )
    if (pick === "conflict") {
      syncLog("merge conflict", { entityType: "card", entityId: local.id })
      const choice = await resolveConflictChoice(
        {
          key: `card:${local.id}`,
          entityType: "card",
          entityId: local.id,
          localUpdatedAt: local.updatedAt,
          remoteUpdatedAt: remoteCard.updatedAt,
          localSummary: cardSummary(local),
          remoteSummary: cardSummary(remoteCard),
          local,
          remote: remoteCard,
        },
        onConflict,
      )
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
    const pick = resolveEntityMerge(
      local,
      remoteRow,
      lastSyncedAt,
      !schedulingChanged(local, remoteRow),
    )
    if (pick === "conflict") {
      syncLog("merge conflict", {
        entityType: "scheduling",
        entityId: local.id,
      })
      const choice = await resolveConflictChoice(
        {
          key: `scheduling:${local.id}`,
          entityType: "scheduling",
          entityId: local.id,
          localUpdatedAt: local.updatedAt,
          remoteUpdatedAt: remoteRow.updatedAt,
          localSummary: schedulingSummary(local),
          remoteSummary: schedulingSummary(remoteRow),
          local,
          remote: remoteRow,
        },
        onConflict,
      )
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

async function syncOneMediaItem(
  storage: FirebaseStorage,
  uid: string,
  mediaId: string,
  remote: RemoteSnapshot,
  lastSyncedAt: number | null,
  localById: Map<string, MediaRow>,
  tombstonedMedia: Set<string>,
  onConflict: (c: SyncConflict) => Promise<SyncConflictChoice>,
): Promise<void> {
  if (tombstonedMedia.has(mediaId)) return

  const local = localById.get(mediaId)
  const remoteMeta = remote.mediaMeta.get(mediaId)

  if (local && remoteMeta) {
    const localDigest = await mediaBlobDigest(local.blob)
    let remoteRow: MediaRow
    try {
      remoteRow = await downloadMediaBlob(storage, uid, remoteMeta)
    } catch {
      await uploadMediaBlob(storage, uid, local)
      return
    }
    const remoteDigest = await mediaBlobDigest(remoteRow.blob)
    const pick = resolveEntityMerge(
      { updatedAt: local.updatedAt },
      { updatedAt: remoteMeta.updatedAt },
      lastSyncedAt,
      !mediaChanged(local, remoteMeta, localDigest, remoteDigest),
    )
    if (pick === "conflict") {
      syncLog("merge conflict", { entityType: "media", entityId: mediaId })
      const localUrl = mediaPreviewUrl(local)
      const remoteUrl = mediaPreviewUrl(remoteRow)
      try {
        const choice = await resolveConflictChoice(
          {
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
          },
          onConflict,
        )
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
    return
  }

  if (local && !remoteMeta) {
    await uploadMediaBlob(storage, uid, local)
    return
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

async function syncMedia(
  storage: FirebaseStorage,
  uid: string,
  remote: RemoteSnapshot,
  lastSyncedAt: number | null,
  onConflict: (c: SyncConflict) => Promise<SyncConflictChoice>,
): Promise<void> {
  const cards = await db.cards.toArray()
  const mediaIds = new Set<string>()
  for (const c of cards) {
    for (const id of c.content.images) mediaIds.add(id)
  }
  for (const m of await db.media.toArray()) {
    mediaIds.add(m.id)
  }

  const localMedia = await db.media.toArray()
  const localById = new Map(localMedia.map((m) => [m.id, m]))
  const tombstonedMedia = new Set(
    (await db.tombstones.where("entityType").equals("media").toArray()).map(
      (t) => t.entityId,
    ),
  )

  const ids = [...mediaIds]
  syncLog("syncMedia plan", {
    mediaCount: ids.length,
    cards: cards.length,
    localBlobs: localMedia.length,
    remoteMeta: remote.mediaMeta.size,
  })

  if (ids.length === 0) return

  const concurrency = 4
  await runWithConcurrency(ids, concurrency, async (mediaId, index) => {
    await syncLogTimed(
      `sync media ${index + 1}/${ids.length}`,
      () =>
        syncOneMediaItem(
          storage,
          uid,
          mediaId,
          remote,
          lastSyncedAt,
          localById,
          tombstonedMedia,
          onConflict,
        ),
      { mediaId: mediaId.slice(0, 40) },
    )
  })
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
  const prunedTombs = await syncLogTimed("prune orphan media tombstones", () =>
    pruneOrphanMediaTombstones(),
  )
  if (prunedTombs > 0) {
    syncLog("pruned orphan media tombstones", { count: prunedTombs })
  }
  await syncLogTimed("merge decks/cards/scheduling", () =>
    collectEntityConflicts(lastSyncedAt, remote, onConflict),
  )

  await syncLogTimed("sync media blobs", () =>
    syncMedia(storage, uid, remote, lastSyncedAt, onConflict),
  )

  const remoteMediaIds = new Set(remote.mediaMeta.keys())
  await syncLogTimed("purge tombstoned media in Storage", () =>
    purgeTombstonedMediaStorage(storage, uid, { remoteMediaIds }),
  )

  await syncLogTimed("push local to remote", () =>
    pushLocalToRemote(fs, uid, remote),
  )

  const hydrate = await syncLogTimed("hydrate card images for review", () =>
    hydrateReferencedMedia(uid),
  )
  syncLog("hydrate card images complete", hydrate)

  writeLastSyncedAt(Date.now())
  syncLog("runFullSync complete")
}

/** Push local changes without merge (after edits while signed in). */
export async function runPushOnly(
  fs: Firestore,
  storage: FirebaseStorage,
  uid: string,
): Promise<void> {
  await pruneOrphanMediaTombstones()
  await purgeTombstonedMediaStorage(storage, uid)
  const remote = await fetchRemoteSnapshot(fs, uid, "push")
  await syncMedia(storage, uid, remote, readLastSyncedAt(), async () => "local")
  await pushLocalToRemote(fs, uid, remote)
}
