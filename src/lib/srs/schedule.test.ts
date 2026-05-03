import { describe, expect, it } from "vitest"
import { Rating } from "ts-fsrs"
import {
  applyGrade,
  deserializeFsrs,
  emptyFsrs,
  serializeFsrs,
} from "./schedule"

describe("serializeFsrs / deserializeFsrs", () => {
  it("round-trips dates", () => {
    const c = emptyFsrs()
    const back = deserializeFsrs(serializeFsrs(c))
    expect(back.due.getTime()).toBe(c.due.getTime())
    expect(back.stability).toBe(c.stability)
  })
})

describe("applyGrade", () => {
  it("advances schedule on Good", () => {
    const start = emptyFsrs()
    const now = new Date("2026-01-01T12:00:00Z")
    const next = applyGrade(start, now, Rating.Good)
    expect(next.due.getTime()).not.toBe(start.due.getTime())
  })
})
