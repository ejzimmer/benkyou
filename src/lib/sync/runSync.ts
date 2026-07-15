import type { Firestore } from "firebase/firestore"
import type { FirebaseStorage } from "firebase/storage"
import type { Card, Deck } from "../../domain/types"
import { db, type MediaRow, type SchedulingRow } from "../db/schema"
import {
  cardChanged,
  cardSummary,
  deckChanged,
  deckSummary,
  mediaChanged,
  mediaSummary,
  resolveEntityMerge,
  schedulingChanged,
  schedulingDiffDetails,
  schedulingSummary,
  summariesLookIdentical,
  mediaBlobDigest,
} from "./syncCompare"
import {
  fetchRemoteSnapshot,
  hasAnyRemoteChangesSince,
  hasEntityCountMismatch,
  pushLocalToRemote,
  type RemoteSnapshot,
} from "./firestoreSync"
import {
  downloadMediaBlob,
  ensureMediaDigest,
  hydrateReferencedMedia,
  mediaPreviewUrl,
  uploadMediaBlob,
} from "./mediaSync"
import { purgeTombstonedMediaStorage } from "./purgeMediaStorage"
import { runWithConcurrency } from "./runWithConcurrency"
import { mergeTombstone } from "./tombstoneMerge"
import { pruneOrphanMediaTombstones, recordTombstone } from "./tombstones"
import { tombstoneId } from "./syncCompare"
import {
  LAST_SYNCED_AT_KEY,
  type SyncConflict,
  type SyncConflictChoice,
  type Tombstone,
} from "./syncTypes"
import { syncLog, syncLogTimed } from "./syncLog"
import { yieldPeriodically } from "../yieldToMain"

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

/** Coarse, user-facing sync progress for a loading indicator. */
export type SyncProgress = {
  /** Friendly phase label, e.g. "Downloading images…". */
  phase: string
  /** Item progress within the phase, when known (e.g. images). */
  current?: number
  total?: number
}

export type RunSyncOptions = {
  fs: Firestore
  storage: FirebaseStorage
  uid: string
  onConflict: (conflict: SyncConflict) => Promise<SyncConflictChoice>
  onProgress?: (progress: SyncProgress) => void
}

function tombstoneWins(
  tomb: Tombstone | undefined,
  entityUpdatedAt: number | undefined,
): boolean {
  if (!tomb) return false
  if (entityUpdatedAt == null) return true
  return tomb.deletedAt >= entityUpdatedAt
}

/**
 * A local entity with no tombstone is missing from the remote snapshot. If
 * this device already knew about it as of the last successful sync and
 * hasn't touched it since, its absence can only mean another device deleted
 * it (and that device's tombstone just hasn't reached Firestore yet — the
 * tombstone push is debounced). Otherwise — first-ever sync, or created/
 * edited locally since — it simply hasn't been pushed yet, so it should be
 * left alone; `pushLocalToRemote` will upload it later in this same sync.
 * Without this check, an unrelated device's full sync would re-upload its
 * (still-local) copy of a just-deleted deck and resurrect it for everyone.
 */
function vanishedFromRemote(
  local: { updatedAt: number },
  lastSyncedAt: number | null,
): boolean {
  return lastSyncedAt != null && local.updatedAt <= lastSyncedAt
}

function remoteEntityUpdatedAt(
  remote: RemoteSnapshot,
  t: Tombstone,
): number | undefined {
  switch (t.entityType) {
    case "deck":
      return remote.decks.get(t.entityId)?.updatedAt
    case "card":
      return remote.cards.get(t.entityId)?.updatedAt
    case "scheduling":
      return remote.scheduling.get(t.entityId)?.updatedAt
    case "media":
      return remote.mediaMeta.get(t.entityId)?.updatedAt
  }
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
        // Stale tombstone: a newer copy of the entity exists in the remote
        // snapshot (e.g. user deleted then re-imported on another device).
        // Drop the tombstone locally so collectEntityConflicts can write
        // the resurrected entity; the next push removes it from Firestore.
        const remoteUpdatedAt = remoteEntityUpdatedAt(remote, t)
        if (remoteUpdatedAt != null && remoteUpdatedAt > t.deletedAt) {
          syncLog("dropping stale tombstone (newer entity exists)", {
            tombstoneId: t.id,
            tombDeletedAt: t.deletedAt,
            remoteUpdatedAt,
          })
          await db.tombstones.delete(t.id)
          continue
        }

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

/**
 * Re-checks the tombstone and performs `write` atomically in one Dexie
 * transaction. `collectEntityConflicts` below checks a tombstone and later
 * calls `db.<table>.put(...)` for the same entity — those two calls used to
 * be separate transactions, so a concurrent deleteDeck()/deleteCard() could
 * record its tombstone and delete the entity in the gap between them,
 * un-deleting it. Wrapping just this final check+write pair (never the
 * `onConflict` UI wait, which can block indefinitely) closes that window.
 */
async function putIfNotTombstoned(
  tombstoneKey: string,
  write: () => Promise<unknown>,
): Promise<void> {
  await db.transaction(
    "rw",
    [db.tombstones, db.decks, db.cards, db.scheduling],
    async () => {
      if (await db.tombstones.get(tombstoneKey)) return
      await write()
    },
  )
}

/**
 * Like `putIfNotTombstoned`, but also re-checks that the local row hasn't
 * been written to since `collectEntityConflicts` took its up-front snapshot.
 * `pick`/`winner` are computed from that stale snapshot, so without this
 * guard a fresher local write racing with sync (e.g. a review answer
 * updating a scheduling row's `due` date mid-sync) gets silently
 * overwritten with the merge decision made from the stale copy. Skipping
 * the write here just leaves the row for the next sync pass, which will
 * re-snapshot and compare against the now-current local value.
 *
 * Staleness is judged by content, not `updatedAt`: timestamps only have
 * millisecond resolution, so a racing write landing in the same
 * millisecond as the snapshot would be invisible to a timestamp comparison
 * and the stale write would go through anyway.
 */
async function putIfNotStale<T extends { updatedAt: number }>(
  tombstoneKey: string,
  getCurrent: () => Promise<T | undefined>,
  local: T,
  changed: (current: T, local: T) => boolean,
  write: () => Promise<unknown>,
): Promise<void> {
  await db.transaction(
    "rw",
    [db.tombstones, db.decks, db.cards, db.scheduling],
    async () => {
      if (await db.tombstones.get(tombstoneKey)) return
      const current = await getCurrent()
      if (current && changed(current, local)) return
      await write()
    },
  )
}

/**
 * Snapshot of what's tombstoned/local right now, used for the up-front
 * "should I even look at this row" checks in `collectEntityConflicts`. Those
 * checks used to be individual `db.tombstones.get(...)` / `db.<table>.get(...)`
 * calls per row — for a few thousand cards/scheduling rows that's thousands
 * of sequential IndexedDB round trips (measured ~9.4s of a real sync for
 * ~1700 cards + ~3300 scheduling rows), which is most of what made the app
 * unresponsive right after load. One bulk read up front plus in-memory Set
 * lookups replaces all of them; the actual writes still re-check tombstones
 * and staleness just before writing (via `putIfNotStale`/`putIfNotTombstoned`),
 * so this snapshot only needs to be an up-front fast path, not authoritative.
 */
async function collectEntityConflicts(
  lastSyncedAt: number | null,
  remote: RemoteSnapshot,
  onConflict: (c: SyncConflict) => Promise<SyncConflictChoice>,
): Promise<void> {
  const localDecks = await db.decks.toArray()
  const localCards = await db.cards.toArray()
  const localSched = await db.scheduling.toArray()
  const tombstoneIds = new Set(
    (await db.tombstones.toArray()).map((t) => t.id),
  )
  const localDeckIds = new Set(localDecks.map((d) => d.id))
  const localCardIds = new Set(localCards.map((c) => c.id))
  const localSchedIds = new Set(localSched.map((s) => s.id))

  for (let i = 0; i < localDecks.length; i++) {
    await yieldPeriodically(i)
    const local = localDecks[i]
    if (tombstoneIds.has(tombstoneId("deck", local.id))) continue
    const remoteDeck = remote.decks.get(local.id)
    if (!remoteDeck) {
      if (vanishedFromRemote(local, lastSyncedAt)) {
        syncLog("deck vanished from remote, deleting locally", {
          entityId: local.id,
        })
        await recordTombstone("deck", local.id)
        await db.decks.delete(local.id)
      }
      continue
    }
    // Content already matches remote — nothing to reconcile. Checking this
    // up front (rather than letting resolveEntityMerge pick a "winner" by
    // timestamp) matters because ties go to remote, whose object is never
    // `=== local` even when its payload is identical; without this the
    // `winner === local` guard below misses the tie case and every
    // unchanged deck gets rewritten to IndexedDB on every sync.
    if (!deckChanged(local, remoteDeck)) continue
    const pick = resolveEntityMerge(local, remoteDeck, lastSyncedAt, false)
    let winner: Deck
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
      winner = choice === "local" ? local : remoteDeck
    } else {
      winner = pick === "local" ? local : remoteDeck
    }
    // Winner is the exact local record already in the DB — writing it back
    // would be a no-op that still fires live-query subscribers.
    if (winner === local) continue
    await putIfNotStale(
      tombstoneId("deck", local.id),
      () => db.decks.get(local.id),
      local,
      deckChanged,
      () => db.decks.put(winner),
    )
  }

  const remoteDecksArr = [...remote.decks.values()]
  for (let i = 0; i < remoteDecksArr.length; i++) {
    await yieldPeriodically(i)
    const remoteDeck = remoteDecksArr[i]
    if (tombstoneIds.has(tombstoneId("deck", remoteDeck.id))) continue
    if (localDeckIds.has(remoteDeck.id)) continue
    await putIfNotTombstoned(tombstoneId("deck", remoteDeck.id), async () => {
      if (await db.decks.get(remoteDeck.id)) return
      await db.decks.put(remoteDeck)
    })
  }

  for (let i = 0; i < localCards.length; i++) {
    await yieldPeriodically(i)
    const local = localCards[i]
    if (tombstoneIds.has(tombstoneId("card", local.id))) continue
    const remoteCard = remote.cards.get(local.id)
    if (!remoteCard) {
      if (vanishedFromRemote(local, lastSyncedAt)) {
        syncLog("card vanished from remote, deleting locally", {
          entityId: local.id,
        })
        await recordTombstone("card", local.id)
        await db.cards.delete(local.id)
        await db.scheduling.where("cardId").equals(local.id).delete()
      }
      continue
    }
    // See the deck loop above: skip entities whose content already matches
    // remote instead of letting a timestamp tie route through resolveEntityMerge.
    if (!cardChanged(local, remoteCard)) continue
    const pick = resolveEntityMerge(local, remoteCard, lastSyncedAt, false)
    let winner: Card
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
      winner = choice === "local" ? local : remoteCard
    } else {
      winner = pick === "local" ? local : remoteCard
    }
    // Winner is the exact local record already in the DB — writing it back
    // would be a no-op that still fires live-query subscribers (e.g. the
    // card-edit form), potentially clobbering an in-progress edit.
    if (winner === local) continue
    await putIfNotStale(
      tombstoneId("card", local.id),
      () => db.cards.get(local.id),
      local,
      cardChanged,
      () => db.cards.put(winner),
    )
  }

  const remoteCardsArr = [...remote.cards.values()]
  for (let i = 0; i < remoteCardsArr.length; i++) {
    await yieldPeriodically(i)
    const remoteCard = remoteCardsArr[i]
    if (tombstoneIds.has(tombstoneId("card", remoteCard.id))) continue
    if (localCardIds.has(remoteCard.id)) continue
    await putIfNotTombstoned(tombstoneId("card", remoteCard.id), async () => {
      if (await db.cards.get(remoteCard.id)) return
      await db.cards.put(remoteCard)
    })
  }

  for (let i = 0; i < localSched.length; i++) {
    await yieldPeriodically(i)
    const local = localSched[i]
    if (tombstoneIds.has(tombstoneId("scheduling", local.id))) continue
    const remoteRow = remote.scheduling.get(local.id)
    if (!remoteRow) {
      if (vanishedFromRemote(local, lastSyncedAt)) {
        syncLog("scheduling row vanished from remote, deleting locally", {
          entityId: local.id,
        })
        await recordTombstone("scheduling", local.id)
        await db.scheduling.delete(local.id)
      }
      continue
    }
    // See the deck loop above: skip entities whose content already matches
    // remote instead of letting a timestamp tie route through resolveEntityMerge.
    if (!schedulingChanged(local, remoteRow)) continue
    const pick = resolveEntityMerge(local, remoteRow, lastSyncedAt, false)
    let winner: SchedulingRow
    if (pick === "conflict") {
      syncLog("merge conflict", {
        entityType: "scheduling",
        entityId: local.id,
      })
      // Card merging has already settled by this point, so this reflects
      // whichever version of the card the user is about to see reviewed.
      const card = await db.cards.get(local.cardId)
      const choice = await resolveConflictChoice(
        {
          key: `scheduling:${local.id}`,
          entityType: "scheduling",
          entityId: local.id,
          localUpdatedAt: local.updatedAt,
          remoteUpdatedAt: remoteRow.updatedAt,
          localSummary: schedulingSummary(local),
          remoteSummary: schedulingSummary(remoteRow),
          contextLabel: card ? cardSummary(card) : undefined,
          differences: schedulingDiffDetails(local, remoteRow),
          local,
          remote: remoteRow,
        },
        onConflict,
      )
      winner = choice === "local" ? local : remoteRow
    } else {
      winner = pick === "local" ? local : remoteRow
    }
    // Winner is the exact local record already in the DB — writing it back
    // would be a no-op that still fires live-query subscribers (e.g. a
    // review session queue), potentially re-adding a just-answered card.
    if (winner === local) continue
    await putIfNotStale(
      tombstoneId("scheduling", local.id),
      () => db.scheduling.get(local.id),
      local,
      schedulingChanged,
      () => db.scheduling.put(winner),
    )
  }

  const remoteSchedArr = [...remote.scheduling.values()]
  for (let i = 0; i < remoteSchedArr.length; i++) {
    await yieldPeriodically(i)
    const remoteRow = remoteSchedArr[i]
    if (tombstoneIds.has(tombstoneId("scheduling", remoteRow.id))) continue
    if (localSchedIds.has(remoteRow.id)) continue
    await putIfNotTombstoned(
      tombstoneId("scheduling", remoteRow.id),
      async () => {
        if (await db.scheduling.get(remoteRow.id)) return
        await db.scheduling.put(remoteRow)
      },
    )
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
    const localWithDigest = await ensureMediaDigest(local)
    const localDigest = localWithDigest.digest as string

    // Both sides already agree on content — nothing to upload or download.
    if (
      remoteMeta.digest &&
      remoteMeta.digest === localDigest &&
      remoteMeta.mimeType === localWithDigest.mimeType
    ) {
      return
    }

    let remoteRow: MediaRow
    try {
      remoteRow = await downloadMediaBlob(storage, uid, remoteMeta)
    } catch {
      await uploadMediaBlob(storage, uid, localWithDigest)
      return
    }
    // Remote metadata predates hash tracking — hash it once now so future
    // syncs can compare without downloading again.
    const remoteDigest =
      remoteMeta.digest ?? (await mediaBlobDigest(remoteRow.blob))
    remoteRow = { ...remoteRow, digest: remoteDigest }

    const pick = resolveEntityMerge(
      { updatedAt: local.updatedAt },
      { updatedAt: remoteMeta.updatedAt },
      lastSyncedAt,
      !mediaChanged(localWithDigest, remoteMeta, localDigest, remoteDigest),
    )
    if (pick === "conflict") {
      syncLog("merge conflict", { entityType: "media", entityId: mediaId })
      const localUrl = mediaPreviewUrl(localWithDigest)
      const remoteUrl = mediaPreviewUrl(remoteRow)
      try {
        const choice = await resolveConflictChoice(
          {
            key: `media:${mediaId}`,
            entityType: "media",
            entityId: mediaId,
            localUpdatedAt: local.updatedAt,
            remoteUpdatedAt: remoteMeta.updatedAt,
            localSummary: mediaSummary(localWithDigest),
            remoteSummary: mediaSummary(remoteMeta),
            local: localWithDigest,
            remote: remoteRow,
            localPreviewUrl: localUrl,
            remotePreviewUrl: remoteUrl,
          },
          onConflict,
        )
        const winner = choice === "local" ? localWithDigest : remoteRow
        await db.media.put(winner)
        await uploadMediaBlob(storage, uid, winner)
      } finally {
        URL.revokeObjectURL(localUrl)
        URL.revokeObjectURL(remoteUrl)
      }
    } else if (pick === "remote") {
      await db.media.put(remoteRow)
    } else {
      await uploadMediaBlob(storage, uid, localWithDigest)
    }
    return
  }

  if (local && !remoteMeta) {
    const localWithDigest = await ensureMediaDigest(local)
    await uploadMediaBlob(storage, uid, localWithDigest)
    return
  }

  if (!local && remoteMeta) {
    try {
      const remoteRow = await downloadMediaBlob(storage, uid, remoteMeta)
      const digest =
        remoteMeta.digest ?? (await mediaBlobDigest(remoteRow.blob))
      await db.media.put({ ...remoteRow, digest })
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

/**
 * Upper bound on how long the no-op short-circuit is allowed to keep
 * skipping the full pipeline before one runs anyway, regardless of what the
 * cheap checks report. `updatedAt`/`deletedAt` are client-set via
 * `Date.now()`, not Firestore's server timestamp, so a remote write from a
 * device whose clock runs sufficiently behind ours could carry a timestamp
 * at or before our own `lastSyncedAt` and be permanently invisible to the
 * ">" check — worse, since `lastSyncedAt` only advances forward on this
 * device, that gap never closes on its own. Widening the query's lower
 * bound to compensate was tried and rejected: because `lastSyncedAt` itself
 * keeps sliding forward, a fixed-size widen re-flags any row touched within
 * that window of *now* as "changed" on every subsequent sync, defeating the
 * short-circuit for several minutes after every write. A periodic ceiling
 * bounds the same worst case (silently missing a skewed write) without that
 * cost: any gap a timestamp check misses gets caught by the next forced
 * full pipeline regardless.
 */
const MAX_SHORT_CIRCUIT_INTERVAL_MS = 15 * 60 * 1000

/**
 * Cheap local-side counterpart to `hasAnyRemoteChangesSince`: indexed
 * range checks instead of a full-table scan, so this stays fast regardless
 * of collection size.
 */
async function hasAnyLocalChangesSince(sinceMs: number): Promise<boolean> {
  const rows = await Promise.all([
    db.decks.where("updatedAt").above(sinceMs).first(),
    db.cards.where("updatedAt").above(sinceMs).first(),
    db.scheduling.where("updatedAt").above(sinceMs).first(),
    db.tombstones.where("deletedAt").above(sinceMs).first(),
    db.media.where("updatedAt").above(sinceMs).first(),
  ])
  return rows.some((row) => row != null)
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

/**
 * `lastSyncedAt` isn't scoped per-account — clear it on sign-out so a
 * different user signing in on the same device/browser can't inherit a
 * marker from the previous account and have the no-op short-circuit skip
 * pulling their data because it looks like "nothing changed since".
 */
export function clearLastSyncedAt(): void {
  localStorage.removeItem(LAST_SYNCED_AT_KEY)
}

export async function runFullSync(options: RunSyncOptions): Promise<void> {
  const { fs, storage, uid, onConflict, onProgress } = options
  const report = onProgress ?? (() => {})
  syncLog("runFullSync start", { uid, lastSyncedAt: readLastSyncedAt() })
  const lastSyncedAt = readLastSyncedAt()
  // Captured before any checks/fetches run, so the marker we persist can
  // never be newer than the instant we started looking — otherwise a write
  // that lands on either side while the checks themselves are in flight
  // could fall between "the snapshot we checked" and "the timestamp we
  // recorded," and never get picked up by a later sync.
  const syncStartedAt = Date.now()

  report({ phase: "Checking for changes…" })

  try {
    // On every sync after the first, a cheap existence check ("does anything
    // have a newer timestamp than my last sync, on either side") can rule out
    // the common case — nothing changed anywhere — without paying for the
    // full 5-collection download that dominates a no-op resync's cost. Any
    // doubt (first-ever sync, or either side reports a change) falls through
    // to the full, already-correct pipeline below.
    //
    // `lastSyncedAt` lives in localStorage, separate from the actual data in
    // IndexedDB — if the local database is ever wiped or corrupted without
    // that marker also being cleared (e.g. storage eviction clearing one but
    // not the other), a completely empty local database would otherwise look
    // exactly like "nothing changed" and permanently skip re-pulling
    // everything. Requiring at least one local row rules that out: a device
    // that has genuinely synced before has *something* locally (unless the
    // account itself is empty, in which case a full sync is cheap anyway).
    const hasAnyLocalEntities =
      lastSyncedAt != null &&
      ((await db.decks.count()) > 0 ||
        (await db.cards.count()) > 0 ||
        (await db.scheduling.count()) > 0)

    // See `MAX_SHORT_CIRCUIT_INTERVAL_MS` for why this ceiling exists: it
    // bounds how long a clock-skewed remote write (or any other gap a
    // timestamp/count check might miss) could stay silently undetected.
    const withinShortCircuitCeiling =
      lastSyncedAt != null &&
      Date.now() - lastSyncedAt < MAX_SHORT_CIRCUIT_INTERVAL_MS

    if (lastSyncedAt != null && hasAnyLocalEntities && withinShortCircuitCeiling) {
      const [remoteChanged, localChanged] = await Promise.all([
        syncLogTimed("check remote changed since last sync", () =>
          hasAnyRemoteChangesSince(fs, uid, lastSyncedAt),
        ),
        syncLogTimed("check local changed since last sync", () =>
          hasAnyLocalChangesSince(lastSyncedAt),
        ),
      ])
      if (!remoteChanged && !localChanged) {
        // Neither side has a newer timestamp, but that alone can't rule out a
        // silent remote deletion (removed doc, tombstone not pushed yet) — a
        // document-count check closes that gap before trusting the skip.
        const countMismatch = await syncLogTimed(
          "check entity count mismatch",
          () => hasEntityCountMismatch(fs, uid),
        )
        if (!countMismatch) {
          syncLog("nothing changed on either side — skipping full sync")
          // Media downloads can fail or get interrupted independently of
          // whether any entity metadata changed — still worth a cheap retry
          // pass so a stuck image isn't stranded forever once the
          // short-circuit starts engaging on every subsequent load.
          const hydrate = await syncLogTimed(
            "hydrate card images for review (no-op path)",
            () =>
              hydrateReferencedMedia(uid, (current, total) =>
                report({ phase: "Downloading images…", current, total }),
              ),
          )
          syncLog("hydrate card images complete (no-op path)", hydrate)
          writeLastSyncedAt(syncStartedAt)
          report({ phase: "Finishing up…" })
          syncLog("runFullSync complete (no-op)")
          return
        }
        syncLog("entity count mismatch — falling back to full sync")
      }
    }
  } catch (err) {
    syncLog("no-op pre-check failed — falling back to full sync", {
      error: err instanceof Error ? err.message : String(err),
    })
  }

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
  report({ phase: "Merging cards…" })
  await syncLogTimed("merge decks/cards/scheduling", () =>
    collectEntityConflicts(lastSyncedAt, remote, onConflict),
  )

  report({ phase: "Downloading images…" })
  await syncLogTimed("sync media blobs", () =>
    syncMedia(storage, uid, remote, lastSyncedAt, onConflict),
  )

  const remoteMediaIds = new Set(remote.mediaMeta.keys())
  await syncLogTimed("purge tombstoned media in Storage", () =>
    purgeTombstonedMediaStorage(storage, uid, { remoteMediaIds }),
  )

  report({ phase: "Uploading your changes…" })
  await syncLogTimed("push local to remote", () =>
    pushLocalToRemote(fs, uid, remote),
  )

  const hydrate = await syncLogTimed("hydrate card images for review", () =>
    hydrateReferencedMedia(uid, (current, total) =>
      report({ phase: "Downloading images…", current, total }),
    ),
  )
  syncLog("hydrate card images complete", hydrate)

  writeLastSyncedAt(syncStartedAt)
  report({ phase: "Finishing up…" })
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
