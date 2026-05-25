import { db } from "../db/schema"
import type { SyncEntityType, Tombstone } from "./syncTypes"
import { tombstoneId } from "./syncCompare"

export async function recordTombstone(
  entityType: SyncEntityType,
  entityId: string,
  deletedAt = Date.now(),
): Promise<Tombstone> {
  const row: Tombstone = {
    id: tombstoneId(entityType, entityId),
    entityType,
    entityId,
    deletedAt,
  }
  await db.tombstones.put(row)
  return row
}

export async function listLocalTombstones(): Promise<Tombstone[]> {
  return db.tombstones.toArray()
}

export async function isTombstoned(
  entityType: SyncEntityType,
  entityId: string,
): Promise<boolean> {
  return Boolean(await db.tombstones.get(tombstoneId(entityType, entityId)))
}

export async function clearTombstone(
  entityType: SyncEntityType,
  entityId: string,
): Promise<void> {
  await db.tombstones.delete(tombstoneId(entityType, entityId))
}

/** Drop media tombstones that no card references and have no local blob left. */
export async function pruneOrphanMediaTombstones(): Promise<number> {
  const referenced = new Set<string>()
  for (const card of await db.cards.toArray()) {
    for (const id of card.content.images) referenced.add(id)
  }

  let removed = 0
  for (const t of await db.tombstones
    .where("entityType")
    .equals("media")
    .toArray()) {
    if (referenced.has(t.entityId)) continue
    if (await db.media.get(t.entityId)) continue
    await db.tombstones.delete(t.id)
    removed++
  }
  return removed
}
