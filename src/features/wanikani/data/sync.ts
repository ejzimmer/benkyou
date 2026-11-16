import type { WaniKaniClient } from '../api/client'
import type { Resource } from '../api/types'
import { type CollectionName, db } from './db'

const COLLECTION_PATHS: Record<CollectionName, string> = {
  subjects: '/subjects',
  assignments: '/assignments',
  reviewStatistics: '/review_statistics',
  studyMaterials: '/study_materials',
  spacedRepetitionSystems: '/spaced_repetition_systems',
}

export async function sync(client: WaniKaniClient) {
  const collections = Object.keys(COLLECTION_PATHS) as CollectionName[]
  await Promise.all([syncUser(client), ...collections.map((name) => syncCollection(client, name))])
}

async function syncUser(client: WaniKaniClient) {
  const { data } = await client.getUser()
  await db.user.put({ id: 'me', user: data, syncedAt: Temporal.Now.instant().toString() })
}

async function syncCollection(client: WaniKaniClient, name: CollectionName) {
  const state = await db.syncState.get(name)
  const params: Record<string, string> = state ? { updated_after: state.lastUpdatedAt } : {}
  const items = await client.getAll<unknown>(COLLECTION_PATHS[name], params)

  // Use the server's own timestamps rather than this device's clock, so a
  // device with the wrong time can't make us skip updates.
  const lastUpdatedAt = items.reduce((newest, item) => getNewerUpdate(newest, item), state?.lastUpdatedAt ?? null)

  const table = db.table<Resource<unknown>, number>(name)
  await db.transaction('rw', table, db.syncState, async () => {
    await table.bulkPut(items)
    if (lastUpdatedAt) {
      await db.syncState.put({ collection: name, lastUpdatedAt, lastSyncedAt: Temporal.Now.instant().toString() })
    }
  })
}

function getNewerUpdate(newest: string | null, item: Resource<unknown>) {
  if (!item.data_updated_at) return newest
  if (!newest) return item.data_updated_at
  return Temporal.Instant.compare(item.data_updated_at, newest) > 0 ? item.data_updated_at : newest
}
