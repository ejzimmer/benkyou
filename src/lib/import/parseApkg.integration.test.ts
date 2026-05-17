/**
 * @vitest-environment node
 */
import { existsSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { parseAnkiPackageToBulkImport } from "./parseApkg"

const DOWNLOADS_APKG =
  "/home/erin/Downloads/とんがり帽子のアトリエ-20260514195355.apkg"

function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  return data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength,
  ) as ArrayBuffer
}

describe("parseAnkiPackageToBulkImport (integration)", () => {
  it.skipIf(!existsSync(DOWNLOADS_APKG))(
    "parses single-deck .apkg from Downloads",
    async () => {
      const u8 = readFileSync(DOWNLOADS_APKG)
      const payload = await parseAnkiPackageToBulkImport(toArrayBuffer(u8))
      expect(payload.deck.name).toContain("とんがり帽子")
      expect(payload.cards.length).toBeGreaterThan(0)
      expect(payload.media.length).toBeGreaterThan(0)
      const grammar = payload.cards.find(
        (c) =>
          c.kind === "grammar" && c.content.construction.includes("流し"),
      )
      expect(grammar?.content.translationEn).not.toBe("流し、呼ぶ")
      expect(grammar?.content.images.length).toBeGreaterThan(0)
    },
  )
})
