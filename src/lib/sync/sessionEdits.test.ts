import { beforeEach, describe, expect, it } from "vitest"
import { act, renderHook } from "@testing-library/react"
import {
  clearSessionEdits,
  getSessionEditedCardIds,
  markCardEdited,
  removeSessionEditedCardIds,
  useSessionEditedCardIds,
} from "./sessionEdits"

describe("sessionEdits", () => {
  beforeEach(() => {
    clearSessionEdits()
  })

  it("tracks edited card ids, deduplicating repeats", () => {
    markCardEdited("card-1")
    markCardEdited("card-2")
    markCardEdited("card-1")
    expect(getSessionEditedCardIds().sort()).toEqual(["card-1", "card-2"])
  })

  it("removes only the given ids, leaving edits made since untouched", () => {
    markCardEdited("card-1")
    markCardEdited("card-2")
    removeSessionEditedCardIds(["card-1"])
    expect(getSessionEditedCardIds()).toEqual(["card-2"])
  })

  it("clearSessionEdits empties the set", () => {
    markCardEdited("card-1")
    clearSessionEdits()
    expect(getSessionEditedCardIds()).toEqual([])
  })

  it("returns a stable snapshot reference when nothing changed", () => {
    markCardEdited("card-1")
    const a = getSessionEditedCardIds()
    const b = getSessionEditedCardIds()
    expect(a).toBe(b)
  })

  it("useSessionEditedCardIds re-renders on changes made outside the component", () => {
    const { result } = renderHook(() => useSessionEditedCardIds())
    expect(result.current).toEqual([])

    act(() => markCardEdited("card-1"))
    expect(result.current).toEqual(["card-1"])

    act(() => removeSessionEditedCardIds(["card-1"]))
    expect(result.current).toEqual([])
  })
})
