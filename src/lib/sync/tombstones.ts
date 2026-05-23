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
