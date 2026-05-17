import type { User } from "firebase/auth"
import type { BulkImportPayload } from "../lib/import/types"
import { applyImportDrafts, collectImportGaps, type ImportGapDraft } from "../lib/import/gaps"
import { parseAnkiPackageToBulkImport } from "../lib/import/parseApkg"
import { applyBulkImport } from "./bulkImport"

/** Apply a pre-built import payload (e.g. from `POST /v1/bulk/cards`). */
export async function importBulkPayload(
  payload: BulkImportPayload,
  user: User | null,
): Promise<void> {
  await applyBulkImport(payload, user)
}

/** Parse `.apkg` / `.colpkg` in the browser without writing to IndexedDB. */
export async function parseAnkiPackageFile(
  file: File,
): Promise<BulkImportPayload> {
  const buf = await file.arrayBuffer()
  return parseAnkiPackageToBulkImport(buf)
}

export function ankiImportNeedsUserInput(payload: BulkImportPayload): boolean {
  return collectImportGaps(payload).length > 0
}

/** Merge user-supplied fields, validate, and import. */
export async function completeAnkiImport(
  payload: BulkImportPayload,
  drafts: Record<string, ImportGapDraft>,
  user: User | null,
): Promise<BulkImportPayload> {
  const completed = await applyImportDrafts(payload, drafts)
  await importBulkPayload(completed, user)
  return completed
}

/** Parse and import when every card is already complete. */
export async function importAnkiPackageFile(
  file: File,
  user: User | null,
): Promise<BulkImportPayload> {
  const payload = await parseAnkiPackageFile(file)
  if (ankiImportNeedsUserInput(payload)) {
    return payload
  }
  await importBulkPayload(payload, user)
  return payload
}
