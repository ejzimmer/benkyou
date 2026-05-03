import { db } from "../lib/db/schema"

/** Wipe IndexedDB between tests (Dexie singleton). */
export async function resetDatabase(): Promise<void> {
  await db.delete()
  await db.open()
}
