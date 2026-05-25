/**
 * @vitest-environment node
 *
 * Integration test against the deck shared by the user in
 * `test-decks/とんがり帽子のアトリエ-20260516063503.apkg`.
 *
 * Modern Anki (≥ 23.10) packages individual media payloads with Zstandard
 * compression inside the .apkg / .colpkg zip. The current `parseApkg.ts`
 * decompresses `collection.anki21b` and the `media` index, but reads each
 * media file's bytes raw — so what's stored locally and uploaded to Cloud
 * Storage is the *zstd-compressed* JPEG, mis-tagged as `image/jpeg`. That's
 * the root cause of:
 *
 *   - "<img src=blob:...>" never renders on the importing device
 *   - Firebase Storage cannot generate a thumbnail
 *   - Firefox blocks the response with OpaqueResponseBlocking, because the
 *     declared Content-Type is `image/jpeg` but the magic bytes are
 *     `28 b5 2f fd` (zstd) instead of `ff d8 ff` (JPEG).
 *
 * The test parses the real deck and asserts that every media item's first
 * three bytes are a valid JPEG SOI marker. It fails on `main` today.
 */

import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { parseAnkiPackageToBulkImport } from "./parseApkg"

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

describe("parseAnkiPackageToBulkImport (user deck)", () => {
  it.skipIf(!existsSync(USER_DECK))(
    "decompresses zstd-compressed media payloads back into real JPEGs",
    async () => {
      const u8 = readFileSync(USER_DECK)
      const payload = await parseAnkiPackageToBulkImport(toArrayBuffer(u8))

      expect(payload.media.length).toBeGreaterThan(0)

      const jpegItems = payload.media.filter(
        (m) => m.mimeType === "image/jpeg",
      )
      expect(jpegItems.length).toBeGreaterThan(0)

      for (const item of jpegItems) {
        const bytes = item.bytes
        expect(bytes, `media ${item.id} bytes`).toBeDefined()
        expect(bytes!.byteLength, `media ${item.id} size`).toBeGreaterThan(0)

        // Real JPEG starts with FF D8 FF (Start Of Image + APP marker).
        // Zstd-compressed bytes start with 28 B5 2F FD.
        const first3 = [bytes![0], bytes![1], bytes![2]]
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" ")
        expect(
          first3,
          `media ${item.id} starts with JPEG SOI (not zstd magic)`,
        ).toBe("ff d8 ff")
      }
    },
  )
})
