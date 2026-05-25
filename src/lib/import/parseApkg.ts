import { decompress } from "fzstd"
import JSZip from "jszip"
import initSqlJs, { type Database, type SqlValue } from "sql.js"
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url"
import { convertExtractedPackage } from "./convert"
import {
  isZstdMagic,
  parseMediaEntriesProtobuf,
  parseMediaMapJson,
} from "./mediaIndex"
import type {
  BulkImportPayload,
  ExtractedAnkiNote,
  ExtractedPackage,
} from "./types"

let sqlJsModule: Awaited<ReturnType<typeof initSqlJs>> | null = null

async function getSqlJs() {
  if (!sqlJsModule) {
    sqlJsModule = await initSqlJs({
      locateFile: (file: string) => {
        if (!file.endsWith(".wasm")) return file
        if (typeof process !== "undefined" && process.env.VITEST) {
          return `${process.cwd()}/node_modules/sql.js/dist/sql-wasm.wasm`
        }
        return sqlWasmUrl
      },
    })
  }
  return sqlJsModule
}

async function getCollectionBytes(zip: JSZip): Promise<Uint8Array> {
  const anki21b = zip.file("collection.anki21b")
  const anki21 = zip.file("collection.anki21")
  const anki2 = zip.file("collection.anki2")
  if (anki21b) {
    const raw = await anki21b.async("uint8array")
    if (isZstdMagic(raw)) return decompress(raw)
    return raw
  }
  if (anki21) return anki21.async("uint8array")
  if (anki2) return anki2.async("uint8array")
  throw new Error("No collection.anki21b / collection.anki21 / collection.anki2 in package")
}

async function loadMediaFilenameToZip(zip: JSZip): Promise<Map<string, string>> {
  const mediaFile = zip.file("media")
  if (!mediaFile) return new Map()
  let raw = await mediaFile.async("uint8array")
  if (isZstdMagic(raw)) raw = decompress(raw)
  if (raw.length > 0 && raw[0] === 0x7b) {
    try {
      return parseMediaMapJson(raw)
    } catch {
      /* fall through to protobuf */
    }
  }
  const entries = parseMediaEntriesProtobuf(raw)
  const m = new Map<string, string>()
  for (const [zipName, name] of entries) m.set(name, zipName)
  return m
}

function execFirstNumber(db: Database, sql: string, params: SqlValue[] = []): number {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  if (!stmt.step()) {
    stmt.free()
    throw new Error(`No row: ${sql}`)
  }
  const v = stmt.get()[0]
  stmt.free()
  return Number(v)
}

function execFirstString(db: Database, sql: string, params: SqlValue[] = []): string {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  if (!stmt.step()) {
    stmt.free()
    throw new Error(`No row: ${sql}`)
  }
  const v = stmt.get()[0]
  stmt.free()
  return String(v ?? "")
}

function parseDeckName(db: Database, deckId: number): string {
  const decksJson = execFirstString(db, "SELECT decks FROM col LIMIT 1").trim()
  if (decksJson) {
    try {
      const decks = JSON.parse(decksJson) as Record<
        string,
        { id: number; name: string }
      >
      for (const d of Object.values(decks)) {
        if (d.id === deckId) return d.name
      }
    } catch {
      /* ignore malformed JSON */
    }
  }
  const stmt = db.prepare("SELECT name FROM decks WHERE id = ?")
  stmt.bind([deckId])
  if (stmt.step()) {
    const name = String(stmt.get()[0] ?? "")
    stmt.free()
    if (name) return name
  }
  stmt.free()
  return `Deck ${deckId}`
}

function pickPrimaryDeckId(db: Database): number {
  const stmt = db.prepare(
    "SELECT did, COUNT(*) as cnt FROM cards GROUP BY did ORDER BY cnt DESC LIMIT 1",
  )
  if (!stmt.step()) {
    stmt.free()
    throw new Error("No cards in collection")
  }
  const row = stmt.get()
  stmt.free()
  return Number(row[0])
}

function normalizeMediaRef(ref: string): string {
  const base = ref.split("?")[0] ?? ref
  try {
    return decodeURIComponent(base)
  } catch {
    return base
  }
}

function collectMediaRefs(flds: string): Set<string> {
  const refs = new Set<string>()
  const re = /(?:src|href)=["']([^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(flds)) !== null) refs.add(normalizeMediaRef(m[1]))
  return refs
}

/**
 * Parse a single-deck `.apkg` (or a `.colpkg` / zip with one primary deck) in the browser.
 */
export async function parseAnkiPackageToBulkImport(
  arrayBuffer: ArrayBuffer,
): Promise<BulkImportPayload> {
  const zip = await JSZip.loadAsync(arrayBuffer)
  const collectionBytes = await getCollectionBytes(zip)
  const init = await getSqlJs()
  const db = new init.Database(collectionBytes)
  try {
    const collectionCrt = execFirstNumber(db, "SELECT crt FROM col LIMIT 1")
    const deckId = pickPrimaryDeckId(db)
    const deckName = parseDeckName(db, deckId)

    const noteTypes = new Map<number, string>()
    const ntStmt = db.prepare("SELECT id, name FROM notetypes")
    while (ntStmt.step()) {
      const row = ntStmt.get() as [number, string]
      noteTypes.set(Number(row[0]), String(row[1]))
    }
    ntStmt.free()

    const notesStmt = db.prepare(
      `SELECT n.id as nid, n.mid as mid, n.flds, n.tags
       FROM notes n
       JOIN cards c ON c.nid = n.id
       WHERE c.did = ?
       ORDER BY n.id`,
    )
    notesStmt.bind([deckId])
    const notes: ExtractedAnkiNote[] = []
    const seenNid = new Set<number>()
    while (notesStmt.step()) {
      const r = notesStmt.getAsObject() as {
        nid: number
        mid: number
        flds: string
        tags: string
      }
      const nid = Number(r.nid)
      if (seenNid.has(nid)) continue
      seenNid.add(nid)
      const ntname = noteTypes.get(Number(r.mid)) ?? "Unknown"
      const cardStmt = db.prepare(
        `SELECT id, ord, type, queue, due, ivl, factor, reps, lapses
         FROM cards WHERE nid = ? ORDER BY ord`,
      )
      cardStmt.bind([r.nid])
      const cards = []
      while (cardStmt.step()) {
        const c = cardStmt.getAsObject() as Record<string, number>
        cards.push({
          id: Number(c.id),
          ord: Number(c.ord),
          type: Number(c.type),
          queue: Number(c.queue),
          due: Number(c.due),
          ivl: Number(c.ivl),
          factor: Number(c.factor),
          reps: Number(c.reps),
          lapses: Number(c.lapses),
        })
      }
      cardStmt.free()
      notes.push({
        id: Number(r.nid),
        noteType: ntname,
        fields: String(r.flds).split("\x1f"),
        tags: String(r.tags ?? ""),
        cards,
      })
    }
    notesStmt.free()

    const filenameToZip = await loadMediaFilenameToZip(zip)
    const referenced = new Set<string>()
    for (const n of notes) {
      const flds = n.fields.join("\x1f")
      for (const ref of collectMediaRefs(flds)) referenced.add(ref)
    }

    const mediaPaths: Record<string, string> = {}
    const mediaBytes = new Map<string, Uint8Array>()
    for (const filename of referenced) {
      if (filename.startsWith("temp_file_")) continue
      const zipName = filenameToZip.get(filename)
      if (!zipName) continue
      const entry = zip.file(zipName)
      if (!entry) continue
      const raw = await entry.async("uint8array")
      // Modern Anki (.colpkg / .anki21b) compresses each individual media
      // file with Zstandard. Without this decompression we'd hand zstd bytes
      // to the browser tagged as image/jpeg → unrenderable, ORB-blocked.
      const data = isZstdMagic(raw) ? decompress(raw) : raw
      mediaBytes.set(filename, data)
      mediaPaths[filename] = `media/${filename}`
    }

    const pkg: ExtractedPackage = {
      deckId,
      deckName,
      collectionCrt,
      notes,
      mediaPaths,
    }

    return convertExtractedPackage(pkg, (rel) => {
      const fname = rel.startsWith("media/") ? rel.slice("media/".length) : rel
      const b = mediaBytes.get(fname)
      if (!b) throw new Error(`Missing media file: ${fname}`)
      return b
    })
  } finally {
    db.close()
  }
}
