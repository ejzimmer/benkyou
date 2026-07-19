import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import {
  clearSessionEdits,
  getSessionEditedCardIds,
  markCardEdited,
  removeSessionEditedCardIds,
  useSessionEditedCardIds,
} from "./sessionEdits"

const STORAGE_KEY = "benkyou:sessionEditedCardIds"

describe("sessionEdits", () => {
  beforeEach(() => {
    clearSessionEdits()
    localStorage.removeItem(STORAGE_KEY)
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

  it("mirrors pending edits to localStorage so a reload doesn't forget them", async () => {
    markCardEdited("card-1")
    markCardEdited("card-2")
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]").sort()).toEqual([
      "card-1",
      "card-2",
    ])

    // Simulate a page reload: reset the module registry and re-import so the
    // store re-reads whatever's in localStorage from scratch.
    vi.resetModules()
    const reloaded = await import("./sessionEdits")
    expect(reloaded.getSessionEditedCardIds().sort()).toEqual(["card-1", "card-2"])
  })

  it("clears the localStorage entry once all pending edits are pushed", () => {
    markCardEdited("card-1")
    removeSessionEditedCardIds(["card-1"])
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
