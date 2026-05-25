import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { convertExtractedPackage } from "./convert"
import type { ExtractedPackage } from "./types"

describe("convertExtractedPackage", () => {
  it("converts a small extracted fixture", () => {
    const fixturePath = resolve(
      __dirname,
      "../../test/fixtures/anki-tonagari-mini.json",
    )
    const pkg = JSON.parse(
      readFileSync(fixturePath, "utf8"),
    ) as ExtractedPackage
    const payload = convertExtractedPackage(pkg, (relativePath) => {
      const abs = resolve(__dirname, "../../test/fixtures", relativePath)
      return new Uint8Array(readFileSync(abs))
    })
    expect(
      payload.cards.some(
        (card) => card.kind === "vocabulary" && card.content.wordJa === "陣",
      ),
    ).toBe(true)
    expect(payload.cards.some((card) => card.kind === "grammar")).toBe(true)
    expect(payload.media.length).toBeGreaterThan(0)

    const grammarCard = payload.cards.find((c) => c.kind === "grammar")
    expect(grammarCard?.kind).toBe("grammar")
    if (grammarCard?.kind !== "grammar") return
    const grammarScheduling = payload.scheduling.filter(
      (r) => r.cardId === grammarCard.id,
    )
    expect(grammarScheduling).toHaveLength(2)
    const [a, b] = grammarScheduling
    expect(a.due).toBe(b.due)
    expect(grammarCard.content.translationEn).not.toBe("流し、呼ぶ")
  })
})
