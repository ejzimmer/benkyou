import { describe, expect, it } from "vitest"
import { findTabAtPath } from "./tabs"

describe("tabs", () => {
  describe("findTabAtPath", () => {
    describe("at a tab's own path", () => {
      it("finds the Media tab at the root", () => {
        expect(findTabAtPath("/").id).toBe("media")
      })

      it("finds the Cards tab", () => {
        expect(findTabAtPath("/cards").id).toBe("cards")
      })
    })

    describe("on a page inside a tab", () => {
      it("finds the tab it belongs to", () => {
        expect(findTabAtPath("/decks/d1/cards/c1").id).toBe("cards")
      })
    })

    describe("in a card review session", () => {
      it("finds the Cards tab", () => {
        expect(findTabAtPath("/review").id).toBe("cards")
      })
    })
  })
})
