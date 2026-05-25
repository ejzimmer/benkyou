import type { SyncEntityType } from "./syncTypes"
import { tombstoneId } from "./syncCompare"
import { clearTombstone } from "./tombstones"
import { tombstonePullDecision } from "./tombstonePolicy"
import { db } from "../db/schema"

/** Returns false when a stale tombstone blocks this entity; clears tombstone when entity is newer. */
export async function allowEntitySync(
  entityType: SyncEntityType,
  entityId: string,
  entityUpdatedAt: number,
): Promise<boolean> {
  const tomb = await db.tombstones.get(tombstoneId(entityType, entityId))
  if (tombstonePullDecision(tomb, entityUpdatedAt) === "skip") return false
  if (tomb) await clearTombstone(entityType, entityId)
  return true
}
