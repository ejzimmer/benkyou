import { describe, expect, it } from "vitest"
import { crossedLeechThreshold, LEECH_LAPSE_THRESHOLD } from "./leech"

describe("crossedLeechThreshold", () => {
  it("is false while below the threshold", () => {
    expect(crossedLeechThreshold(0, 1)).toBe(false)
    expect(crossedLeechThreshold(2, LEECH_LAPSE_THRESHOLD - 1)).toBe(false)
  })

  it("is true exactly when lapses first reaches the threshold", () => {
    expect(
      crossedLeechThreshold(LEECH_LAPSE_THRESHOLD - 1, LEECH_LAPSE_THRESHOLD),
    ).toBe(true)
  })

  it("is false once already at or past the threshold before this judgement", () => {
    expect(
      crossedLeechThreshold(LEECH_LAPSE_THRESHOLD, LEECH_LAPSE_THRESHOLD + 1),
    ).toBe(false)
  })
})
