import { describe, expect, it, vi, afterEach, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { AuthProvider } from "../../lib/auth/AuthContext"
import { CardEditPage } from "./CardEditPage"
import { resetDatabase } from "../../test/db"
import { db } from "../../lib/db/schema"
import { defaultVocabulary } from "../../services/cards"

vi.mock("../../lib/firebase", () => ({
  getFirebaseApp: () => null,
  getFirestoreDb: () => null,
  isFirebaseConfigured: () => false,
}))

vi.mock("../../ui/CardImage", () => ({
  CardImage: ({ mediaId }: { mediaId: string }) => (
    <div data-testid="card-image" data-mediaid={mediaId} />
  ),
}))

function renderExistingCardPage() {
  render(
    <MemoryRouter initialEntries={["/decks/deck-1/cards/card-1"]}>
      <AuthProvider>
        <Routes>
          <Route
            path="/decks/:deckId/cards/:cardId"
            element={<CardEditPage />}
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe("CardEditPage remove image", () => {
  beforeEach(async () => {
    await resetDatabase()
    await db.cards.put({
      id: "card-1",
      deckId: "deck-1",
      kind: "vocabulary",
      content: {
        ...defaultVocabulary(),
        wordJa: "猫",
        definitionsEn: ["cat"],
        images: ["media-1"],
      },
      updatedAt: Date.now(),
    })
    await db.media.put({
      id: "media-1",
      blob: new Blob(["fake"], { type: "image/png" }),
      mimeType: "image/png",
      updatedAt: Date.now(),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("removes the image from the card and deletes its blob", async () => {
    const user = userEvent.setup()
    renderExistingCardPage()

    await waitFor(() => {
      expect(screen.getByDisplayValue("猫")).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /remove image/i }),
      ).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: /remove image/i }))

    expect(
      screen.queryByRole("button", { name: /remove image/i }),
    ).not.toBeInTheDocument()

    await waitFor(async () => {
      expect(await db.media.get("media-1")).toBeUndefined()
    })

    const tombstone = await db.tombstones.get("media:media-1")
    expect(tombstone?.entityType).toBe("media")
    expect(tombstone?.entityId).toBe("media-1")
  })
})
