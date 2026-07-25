import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { AuthProvider } from "../../lib/auth/AuthContext"
import { SyncProvider } from "../../lib/sync/SyncContext"
import { CardEditPage } from "./CardEditPage"
import { resetDatabase } from "../../test/db"
import { db } from "../../lib/db/schema"

vi.mock("../../lib/firebase", () => ({
  getFirebaseApp: () => null,
  getFirestoreDb: () => null,
  getFirebaseStorage: () => null,
  isFirebaseConfigured: () => false,
}))

vi.mock("../../ui/CardImage", () => ({
  CardImage: ({ mediaId }: { mediaId: string }) => (
    <div data-testid="card-image" data-mediaid={mediaId} />
  ),
}))

function renderNewCardPage() {
  return render(
    <MemoryRouter initialEntries={["/decks/deck-1/cards/new"]}>
      <AuthProvider>
        <SyncProvider>
        <Routes>
          <Route path="/decks/:deckId/cards/new" element={<CardEditPage />} />
          <Route path="/decks/:deckId" element={<div>Deck page</div>} />
        </Routes>
        </SyncProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe("CardEditPage clipboard images", () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it("adds a pasted clipboard image to a new vocabulary card", async () => {
    const user = userEvent.setup()
    renderNewCardPage()

    const form = screen.getByRole("form", { name: /card editor/i })
    const image = new File(["image-bytes"], "clipboard.png", {
      type: "image/png",
    })

    fireEvent.paste(form, {
      clipboardData: {
        items: [
          {
            kind: "file",
            type: "image/png",
            getAsFile: () => image,
          },
        ],
        files: [],
      },
    })

    const mediaId = await waitFor(async () => {
      const media = await db.media.toArray()
      expect(media).toHaveLength(1)
      expect(media[0]?.mimeType).toBe("image/png")
      return media[0]!.id
    })
    await waitFor(() => {
      expect(screen.getByTestId("card-image")).toHaveAttribute(
        "data-mediaid",
        mediaId,
      )
    })

    await user.type(screen.getByLabelText("日本語で"), "猫")
    await user.click(screen.getByRole("button", { name: "保存" }))

    await waitFor(async () => {
      const cards = await db.cards.toArray()
      expect(cards).toHaveLength(1)
      expect(cards[0]?.content.images).toEqual([mediaId])
    })
  })
})
