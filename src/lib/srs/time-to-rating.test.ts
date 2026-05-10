import { describe, expect, it } from "vitest"
import { Rating } from "ts-fsrs"
import { responseTimeToGrade } from "./time-to-rating"

describe("responseTimeToGrade", () => {
  it("maps incorrect to Again", () => {
    expect(responseTimeToGrade(100, false)).toBe(Rating.Again)
  })
  it("maps fast correct to Easy", () => {
    expect(responseTimeToGrade(500, true)).toBe(Rating.Easy)
  })
})
