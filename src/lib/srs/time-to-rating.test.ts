import { describe, expect, it } from "vitest"
import { Rating } from "ts-fsrs"
import { responseTimeToGrade } from "./time-to-rating"

describe("responseTimeToGrade", () => {
  it("maps incorrect to Again regardless of mode", () => {
    expect(responseTimeToGrade("vocab_oral_en", 100, false)).toBe(Rating.Again)
    expect(responseTimeToGrade("grammar_type_construction", 999_000, false)).toBe(
      Rating.Again,
    )
  })

  it("oral: fast reveal → Easy", () => {
    expect(responseTimeToGrade("vocab_oral_en", 500, true)).toBe(Rating.Easy)
  })

  it("grammar typing tolerates longer reveal than oral for same FSRS tier", () => {
    expect(responseTimeToGrade("grammar_type_construction", 30_000, true)).toBe(
      Rating.Good,
    )
    expect(responseTimeToGrade("vocab_oral_en", 30_000, true)).toBe(Rating.Hard)
  })

  it("null timing → Good when correct", () => {
    expect(responseTimeToGrade("vocab_type_reading", null, true)).toBe(Rating.Good)
  })
})
