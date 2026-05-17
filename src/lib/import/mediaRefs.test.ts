/**
 * @vitest-environment node
 */
import { existsSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { decompress } from "fzstd"
import JSZip from "jszip"
import initSqlJs from "sql.js"
import { isZstdMagic, parseMediaEntriesProtobuf, parseMediaMapJson } from "./mediaIndex"

const APKG =
  "/home/erin/Downloads/とんがり帽子のアトリエ-20260514195355.apkg"

async function loadMediaMap(zip: JSZip) {
  const mediaFile = zip.file("media")
  if (!mediaFile) return new Map<string, string>()
  let raw = await mediaFile.async("uint8array")
  if (isZstdMagic(raw)) raw = decompress(raw)
  if (raw.length > 0 && raw[0] === 0x7b) {
    try {
      return parseMediaMapJson(raw)
    } catch {
      /* protobuf */
    }
  }
  const entries = parseMediaEntriesProtobuf(raw)
  const m = new Map<string, string>()
  for (const [zipName, name] of entries) m.set(name, zipName)
  return m
}

describe("apkg media refs", () => {
  it.skipIf(!existsSync(APKG))("all note image refs resolve in media index", async () => {
    const SQL = await initSqlJs({
      locateFile: (file: string) =>
        `${process.cwd()}/node_modules/sql.js/dist/${file}`,
    })
    const zip = await JSZip.loadAsync(readFileSync(APKG))
    const raw = await zip.file("collection.anki21b")!.async("uint8array")
    const db = new SQL.Database(isZstdMagic(raw) ? decompress(raw) : raw)
    const filenameToZip = await loadMediaMap(zip)
    const re = /(?:src|href)=["']([^"']+)["']/gi
    const missing: string[] = []
    const stmt = db.prepare("SELECT flds FROM notes")
    while (stmt.step()) {
      const flds = String(stmt.get()[0])
      let m: RegExpExecArray | null
      while ((m = re.exec(flds)) !== null) {
        const ref = m[1]
        if (ref.startsWith("temp_file_")) continue
        if (!filenameToZip.has(ref)) missing.push(ref)
      }
    }
    stmt.free()
    db.close()
    expect(missing).toEqual([])
  })
})
