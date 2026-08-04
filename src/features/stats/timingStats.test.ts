import { describe, expect, it } from "vitest"
import { computeTimingStats } from "./timingStats"
import { REVIEW_MODES } from "../../domain/types"
import type { TimingSampleRow } from "../../lib/db/schema"

function sample(
  modeId: TimingSampleRow["modeId"],
  responseMs: number,
  correct: boolean,
): TimingSampleRow {
  return { id: `${modeId}-${responseMs}-${correct}`, ts: 0, modeId, responseMs, correct }
}

describe("computeTimingStats", () => {
  it("returns a row for every review mode, even with no samples", () => {
    const stats = computeTimingStats([])
    expect(stats.map((s) => s.modeId)).toEqual([...REVIEW_MODES])
    for (const s of stats) {
      expect(s.count).toBe(0)
      expect(s.correctRate).toBeNull()
      expect(s.medianCorrectMs).toBeNull()
      expect(s.meanCorrectMs).toBeNull()
    }
  })

  it("computes count, correct rate, median and mean per mode from correct samples only", () => {
    const samples = [
      sample("vocab_type_reading", 1000, true),
      sample("vocab_type_reading", 3000, true),
      sample("vocab_type_reading", 5000, true),
      sample("vocab_type_reading", 9000, false),
      sample("vocab_oral_en", 2000, true),
    ]

    const stats = computeTimingStats(samples)
    const reading = stats.find((s) => s.modeId === "vocab_type_reading")!
    expect(reading.count).toBe(4)
    expect(reading.correctCount).toBe(3)
    expect(reading.correctRate).toBeCloseTo(0.75)
    expect(reading.medianCorrectMs).toBe(3000)
    expect(reading.meanCorrectMs).toBeCloseTo(3000)

    const oral = stats.find((s) => s.modeId === "vocab_oral_en")!
    expect(oral.count).toBe(1)
    expect(oral.correctRate).toBe(1)
    expect(oral.medianCorrectMs).toBe(2000)

    const untouched = stats.find((s) => s.modeId === "grammar_type_construction")!
    expect(untouched.count).toBe(0)
    expect(untouched.correctRate).toBeNull()
  })

  it("averages the two middle values for an even-sized set of correct samples", () => {
    const samples = [
      sample("vocab_oral_en", 1000, true),
      sample("vocab_oral_en", 2000, true),
      sample("vocab_oral_en", 3000, true),
      sample("vocab_oral_en", 4000, true),
    ]

    const [oral] = computeTimingStats(samples)
    expect(oral.medianCorrectMs).toBe(2500)
  })
})
