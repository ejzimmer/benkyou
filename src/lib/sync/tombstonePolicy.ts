import type { Tombstone } from "./syncTypes"

/** True when the tombstone should hide or delete the entity (delete is newer than entity). */
export function tombstoneWins(
  tomb: Tombstone | undefined,
  entityUpdatedAt: number | undefined,
): boolean {
  if (!tomb) return false
  if (entityUpdatedAt == null) return true
  return tomb.deletedAt >= entityUpdatedAt
}

export type TombstonePullDecision = "apply" | "skip"

/** Whether a remote (or revived local) entity should be applied despite a local tombstone row. */
export function tombstonePullDecision(
  tomb: Tombstone | undefined,
  entityUpdatedAt: number,
): TombstonePullDecision {
  if (!tomb) return "apply"
  return tombstoneWins(tomb, entityUpdatedAt) ? "skip" : "apply"
}
