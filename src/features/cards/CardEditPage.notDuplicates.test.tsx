import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { AuthProvider } from "../../lib/auth/AuthContext"
import { SyncProvider } from "../../lib/sync/SyncContext"
import { CardEditPage } from "./CardEditPage"
import { resetDatabase } from "../../test/db"
import { db } from "../../lib/db/schema"
import { defaultVocabulary } from "../../services/cards"

vi.mock("../../lib/firebase", () => ({
  getFirebaseApp: () => null,
  getFirestoreDb: () => null,
  isFirebaseConfigured: () => false,
}))

function renderEditPage(deckId: string, cardId: string) {
  render(
    <MemoryRouter initialEntries={[`/decks/${deckId}/cards/${cardId}`]}>
      <AuthProvider>
        <SyncProvider>
          <Routes>
            <Route path="/decks/:deckId" element={<div>Deck page</div>} />
            <Route path="/decks/:deckId/cards/:cardId" element={<CardEditPage />} />
          </Routes>
        </SyncProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

async function seedPair() {
  await db.cards.bulkPut([
    {
      id: "card-1",
      deckId: "deck-1",
      kind: "vocabulary",
      content: { ...defaultVocabulary(), wordJa: "結論", definitionsEn: ["conclusion"] },
      updatedAt: Date.now(),
    },
    {
      id: "card-2",
      deckId: "deck-1",
      kind: "vocabulary",
      content: {
        ...defaultVocabulary(),
        wordJa: "結論に至る",
        definitionsEn: ["come to a conclusion"],
      },
      updatedAt: Date.now(),
    },
  ])
}

describe("CardEditPage not-a-duplicate marking", () => {
  beforeEach(async () => {
    await resetDatabase()
    await seedPair()
  })

  it("dismisses a match and then restores it", async () => {
    const user = userEvent.setup()
    renderEditPage("deck-1", "card-1")

    await user.click(await screen.findByRole("button", { name: "重複カード見せる" }))
    const dialog = await screen.findByRole("dialog")
    await user.click(within(dialog).getByRole("button", { name: "重複ではない" }))

    // Moves into the dismissed section, where it can be put back.
    const restore = await within(dialog).findByRole("button", { name: "元に戻す" })
    expect(within(dialog).queryByRole("button", { name: "重複ではない" })).not.toBeInTheDocument()
    expect((await db.cards.get("card-1"))?.notDuplicateOf).toEqual(["card-2"])

    await user.click(restore)

    await within(dialog).findByRole("button", { name: "重複ではない" })
    expect((await db.cards.get("card-1"))?.notDuplicateOf).toBeUndefined()
    expect((await db.cards.get("card-2"))?.notDuplicateOf).toBeUndefined()
  })

  it("keeps the toolbar button reachable after a dismissal, so it stays undoable", async () => {
    await db.cards.update("card-1", { notDuplicateOf: ["card-2"] })

    const user = userEvent.setup()
    renderEditPage("deck-1", "card-1")

    await user.click(await screen.findByRole("button", { name: "重複カード見せる" }))

    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText("重複ではないとマーク済み")).toBeInTheDocument()
    expect(within(dialog).getByRole("button", { name: "元に戻す" })).toBeInTheDocument()
  })

  it("honours a verdict recorded only on the other side of the pair", async () => {
    // Same headword both ways, so each card is a candidate duplicate of the
    // other, but only card-3 carries the verdict.
    await db.cards.put({
      id: "card-3",
      deckId: "deck-1",
      kind: "vocabulary",
      content: { ...defaultVocabulary(), wordJa: "結論", definitionsEn: ["conclusion, again"] },
      updatedAt: Date.now(),
      notDuplicateOf: ["card-1"],
    })

    const user = userEvent.setup()
    renderEditPage("deck-1", "card-1")

    await waitFor(() => {
      expect(screen.getByDisplayValue("結論")).toBeInTheDocument()
    })
    await user.click(await screen.findByRole("button", { name: "重複カード見せる" }))

    const dialog = await screen.findByRole("dialog")
    // card-3 is listed as dismissed, card-2 is still a live match.
    const dismissedSection = within(dialog)
      .getByText("重複ではないとマーク済み")
      .closest("section")!
    expect(within(dismissedSection).getByText(/結論/)).toBeInTheDocument()
    expect(within(dismissedSection).getAllByRole("listitem")).toHaveLength(1)
    expect(within(dialog).getAllByRole("button", { name: "重複ではない" })).toHaveLength(1)
  })

  it("keeps the verdict when the card is saved from the edit form", async () => {
    await db.cards.update("card-1", { notDuplicateOf: ["card-2"] })

    const user = userEvent.setup()
    renderEditPage("deck-1", "card-1")

    await waitFor(() => {
      expect(screen.getByDisplayValue("結論")).toBeInTheDocument()
    })
    await user.type(screen.getByLabelText("日本語で"), "！")
    await user.click(screen.getByRole("button", { name: "保存" }))

    // The form doesn't show the verdict, but saving must not wipe it — every
    // save here is a whole-row put.
    await waitFor(async () => {
      expect((await db.cards.get("card-1"))?.content).toMatchObject({ wordJa: "結論！" })
    })
    expect((await db.cards.get("card-1"))?.notDuplicateOf).toEqual(["card-2"])
  })

  it("keeps the target's verdicts when a duplicate is merged in", async () => {
    await db.cards.put({
      id: "card-3",
      deckId: "deck-1",
      kind: "vocabulary",
      content: { ...defaultVocabulary(), wordJa: "結論", definitionsEn: ["conclusion, again"] },
      updatedAt: Date.now(),
    })
    await db.cards.update("card-1", { notDuplicateOf: ["card-3"] })

    const user = userEvent.setup()
    renderEditPage("deck-1", "card-1")

    await user.click(await screen.findByRole("button", { name: "重複カード見せる" }))
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "統合" }),
    )

    await waitFor(async () => {
      expect(await db.cards.get("card-2")).toBeUndefined()
    })
    expect((await db.cards.get("card-1"))?.notDuplicateOf).toEqual(["card-3"])
  })

  it("keeps the verdict when a fill-in-the-gap card is saved", async () => {
    await db.cards.put({
      id: "card-4",
      deckId: "deck-1",
      kind: "grammar",
      content: {
        sentenceWithGap: "彼は___に至った",
        gapMarker: "___",
        construction: "結論",
        translationEn: "He reached a conclusion",
        readings: {},
        images: [],
      },
      updatedAt: Date.now(),
      notDuplicateOf: ["card-1"],
    })

    const user = userEvent.setup()
    renderEditPage("deck-1", "card-4")

    await waitFor(() => {
      expect(screen.getByDisplayValue("結論")).toBeInTheDocument()
    })
    await user.type(screen.getByLabelText("答え"), "！")
    await user.click(screen.getByRole("button", { name: "保存" }))

    // The grammar branch of `onSubmit` builds its own card literal rather
    // than going through `currentCardDraft()`, so it needs the same guard.
    await waitFor(async () => {
      const saved = await db.cards.get("card-4")
      expect(saved?.kind === "grammar" && saved.content.construction).toBe("結論！")
    })
    expect((await db.cards.get("card-4"))?.notDuplicateOf).toEqual(["card-1"])
  })
})
