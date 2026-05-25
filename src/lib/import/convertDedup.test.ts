/**
 * @vitest-environment node
 *
 * Anki users commonly paste the same image into two different notes (e.g. a
 * "Basic" note for recall and a "Basic (type)" note for typing). Anki then
 * stores the image under two different filenames in the .apkg. When those
 * notes get merged into a single Benkyou vocabulary card, the card's
 * `content.images` array used to contain *both* ids, so the review screen
 * rendered the same picture twice.
 *
 * convertExtractedPackage now deduplicates media items by their byte
 * content. These tests pin that.
 */

import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { convertExtractedPackage } from "./convert"
import { parseAnkiPackageToBulkImport } from "./parseApkg"
import type { ExtractedPackage } from "./types"

const SAMPLE_BYTES = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
  0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
])
const OTHER_BYTES = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0xff, 0xee, 0xee, 0xee, 0xee, 0xee,
])

describe("convertExtractedPackage media dedup", () => {
  it("collapses two filenames with identical bytes into one media id", () => {
    // Synthesise a tiny extracted package where the "Basic" note (front=猫,
    // back=cat + paste-A.jpg) and the "Basic (type)" note (front=cat +
    // paste-B.jpg, back=猫) point at the SAME image content under two
    // different filenames.
    const pkg: ExtractedPackage = {
      deckId: 1,
      deckName: "T",
      collectionCrt: 0,
      mediaPaths: {
        "paste-A.jpg": "media/paste-A.jpg",
        "paste-B.jpg": "media/paste-B.jpg",
      },
      notes: [
        {
          id: 100,
          noteType: "Basic",
          fields: ["猫", '<img src="paste-A.jpg"><br>cat'],
          tags: "",
          cards: [
            {
              id: 1,
              ord: 0,
              type: 2,
              queue: 2,
              due: 0,
              ivl: 1,
              factor: 2500,
              reps: 0,
              lapses: 0,
            },
          ],
        },
        {
          id: 101,
          noteType: "Basic (type in the answer)",
          fields: ['<img src="paste-B.jpg"><br>cat', "猫"],
          tags: "",
          cards: [
            {
              id: 2,
              ord: 0,
              type: 2,
              queue: 2,
              due: 0,
              ivl: 1,
              factor: 2500,
              reps: 0,
              lapses: 0,
            },
          ],
        },
      ],
    }

    const payload = convertExtractedPackage(pkg, (rel) =>
      // Both filenames return the same bytes — same picture pasted twice.
      rel.endsWith("paste-A.jpg") || rel.endsWith("paste-B.jpg")
        ? SAMPLE_BYTES
        : new Uint8Array(),
    )

    expect(payload.media).toHaveLength(1)

    const vocab = payload.cards.find(
      (c) => c.kind === "vocabulary" && c.content.wordJa === "猫",
    )
    expect(vocab, "merged vocab card").toBeDefined()
    if (vocab?.kind !== "vocabulary") return
    expect(vocab.content.images).toHaveLength(1)
  })

  it("keeps distinct media items when bytes differ even if shapes are similar", () => {
    const pkg: ExtractedPackage = {
      deckId: 1,
      deckName: "T",
      collectionCrt: 0,
      mediaPaths: {
        "paste-A.jpg": "media/paste-A.jpg",
        "paste-B.jpg": "media/paste-B.jpg",
      },
      notes: [
        {
          id: 200,
          noteType: "Basic",
          fields: ["犬", '<img src="paste-A.jpg"><br>dog'],
          tags: "",
          cards: [
            {
              id: 1,
              ord: 0,
              type: 2,
              queue: 2,
              due: 0,
              ivl: 1,
              factor: 2500,
              reps: 0,
              lapses: 0,
            },
          ],
        },
        {
          id: 201,
          noteType: "Basic (type in the answer)",
          fields: ['<img src="paste-B.jpg"><br>dog', "犬"],
          tags: "",
          cards: [
            {
              id: 2,
              ord: 0,
              type: 2,
              queue: 2,
              due: 0,
              ivl: 1,
              factor: 2500,
              reps: 0,
              lapses: 0,
            },
          ],
        },
      ],
    }

    const payload = convertExtractedPackage(pkg, (rel) =>
      rel.endsWith("paste-A.jpg") ? SAMPLE_BYTES : OTHER_BYTES,
    )

    expect(payload.media).toHaveLength(2)
    const vocab = payload.cards.find(
      (c) => c.kind === "vocabulary" && c.content.wordJa === "犬",
    )
    if (vocab?.kind !== "vocabulary") return
    expect(vocab.content.images).toHaveLength(2)
  })
})

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

describe("user deck: card images render exactly once", () => {
  it.skipIf(!existsSync(USER_DECK))(
    "no card references two media ids whose bytes are identical",
    async () => {
      const u8 = readFileSync(USER_DECK)
      const payload = await parseAnkiPackageToBulkImport(toArrayBuffer(u8))

      const bytesById = new Map<string, Uint8Array>()
      for (const item of payload.media) {
        if (item.bytes) bytesById.set(item.id, item.bytes)
      }

      const offenders: Array<{ cardId: string; label: string }> = []
      for (const card of payload.cards) {
        if (card.content.images.length < 2) continue
        const keys = new Set<string>()
        for (const id of card.content.images) {
          const b = bytesById.get(id)
          if (!b) continue
          const key = `${b.byteLength}:${[...b.slice(0, 32)]
            .map((x) => x.toString(16).padStart(2, "0"))
            .join("")}`
          if (keys.has(key)) {
            const label =
              card.kind === "vocabulary"
                ? card.content.wordJa
                : card.content.sentenceWithGap.slice(0, 60)
            offenders.push({ cardId: card.id, label })
            break
          }
          keys.add(key)
        }
      }
      expect(
        offenders,
        `cards with visually-identical duplicate images: ${offenders
          .map((o) => o.label)
          .join(", ")}`,
      ).toHaveLength(0)
    },
  )
})
