/**
 * @vitest-environment node
 *
 * Verifies the media-extraction progress callback added to
 * `parseAnkiPackage` — the "reading" phase's only real per-item work — using
 * the real deck shared by the user in
 * `test-decks/とんがり帽子のアトリエ-20260516063503.apkg` (known to carry media,
 * see parseApkg.userDeck.test.ts).
 */

import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { parseAnkiPackage } from "./parseApkg"

const USER_DECK = resolve(
  __dirname,
  "../../../test-decks/とんがり帽子のアトリエ-20260516063503.apkg",
)

function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  return data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength,
  ) as ArrayBuffer
}

describe("parseAnkiPackage media progress", () => {
  it.skipIf(!existsSync(USER_DECK))(
    "reports current counting up to a fixed total while extracting media",
    async () => {
      const u8 = readFileSync(USER_DECK)
      const calls: Array<[number, number]> = []
      await parseAnkiPackage(toArrayBuffer(u8), (current, total) => {
        calls.push([current, total])
      })

      expect(calls.length).toBeGreaterThan(1)
      const [, firstTotal] = calls[0]
      expect(firstTotal).toBeGreaterThan(0)
      expect(calls.every(([, total]) => total === firstTotal)).toBe(true)
      expect(calls[0][0]).toBe(0)
      expect(calls[calls.length - 1]).toEqual([firstTotal, firstTotal])
      for (let i = 1; i < calls.length; i++) {
        expect(calls[i][0]).toBeGreaterThan(calls[i - 1][0])
      }
    },
  )
})
