import { clearDatabase } from './data/db'
import { clearCachedCollections } from './status/collectionCache'
import { clearToken } from './token'

export async function signOutOfWaniKani() {
  clearToken()
  await Promise.all([clearDatabase(), clearCachedCollections()])
}
