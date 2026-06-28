import type { User } from "firebase/auth"
import type {
  BulkImportPayload,
  GrammarCandidate,
  GrammarDecisionMap,
} from "../lib/import/types"
import { applyImportDrafts, collectImportGaps, type ImportGapDraft } from "../lib/import/gaps"
import { collectGrammarCandidates, convertExtractedPackage } from "../lib/import/convert"
import {
  parseAnkiPackage,
  parseAnkiPackageToBulkImport,
  type ParsedAnkiPackage,
} from "../lib/import/parseApkg"
import { applyBulkImport } from "./bulkImport"

/** A parsed package held in memory while the user confirms grammar vs vocab. */
export type AnkiImportSession = ParsedAnkiPackage

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

/**
 * Parse a package and surface any grammar candidates for confirmation. The
 * returned session is converted later via {@link convertImportSession} once the
 * user has chosen grammar or vocab for each candidate.
 */
export async function startAnkiImport(file: File): Promise<{
  session: AnkiImportSession
  grammarCandidates: GrammarCandidate[]
}> {
  const buf = await file.arrayBuffer()
  const session = await parseAnkiPackage(buf)
  return { session, grammarCandidates: collectGrammarCandidates(session.pkg) }
}

/** Build the import payload from a session, applying grammar/vocab decisions. */
export function convertImportSession(
  session: AnkiImportSession,
  decisions: GrammarDecisionMap = {},
): BulkImportPayload {
  return convertExtractedPackage(session.pkg, session.readFile, decisions)
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
