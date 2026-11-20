import { beforeEach, describe, expect, it } from "vitest"
import { findTabAtPath, readLastUsedTab, saveLastUsedTab } from "./tabs"

describe("tabs", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe("findTabAtPath", () => {
    describe("at a tab's own path", () => {
      it("finds the Media tab", () => {
        expect(findTabAtPath("/media")?.id).toBe("media")
      })

      it("finds the Cards tab at the root", () => {
        expect(findTabAtPath("/")?.id).toBe("cards")
      })
    })

    describe("on a page inside a tab", () => {
      it("finds no tab", () => {
        expect(findTabAtPath("/cards/new")).toBeUndefined()
      })
    })
  })

  describe("the last-used tab", () => {
    describe("once a tab has been saved", () => {
      it("reads it back", () => {
        saveLastUsedTab("media")

        expect(readLastUsedTab()?.path).toBe("/media")
      })
    })

    describe("when the stored value is not a tab", () => {
      it("reads nothing", () => {
        localStorage.setItem("benkyou.lastUsedTab", "garden")

        expect(readLastUsedTab()).toBeUndefined()
      })
    })
  })
})
