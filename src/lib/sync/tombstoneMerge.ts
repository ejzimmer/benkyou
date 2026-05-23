import type { Tombstone } from "./syncTypes"

/** Merge remote and local tombstones; keep the latest delete and any Storage purge marker. */
export function mergeTombstone(
  local: Tombstone | undefined,
  remote: Tombstone,
): Tombstone {
  if (!local) return remote
  const remoteWins = remote.deletedAt >= local.deletedAt
  const base = remoteWins ? remote : local
  const other = remoteWins ? local : remote
  return {
    ...base,
    storagePurgedAt: base.storagePurgedAt ?? other.storagePurgedAt,
  }
}
