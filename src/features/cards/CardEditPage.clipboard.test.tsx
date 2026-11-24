import { describe, expect, it, vi, beforeEach } from "vitest"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
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
          <Route path="/" element={<div>Home page</div>} />
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

    const form = screen.getByRole("form", { name: /カード編集フォーム/ })
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

  describe("using the paste button", () => {
    function stubClipboardRead(read: () => Promise<ClipboardItem[]>) {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { read },
      })
    }

    async function renderSettledNewCardPage() {
      renderNewCardPage()
      // The page clears form errors once its card query first resolves, which
      // would wipe an error raised by a click that lands before then.
      await act(() => db.cards.count())
    }

    function clipboardItem(type: string, blob: Blob): ClipboardItem {
      return {
        types: [type],
        getType: async () => blob,
      } as unknown as ClipboardItem
    }

    describe("when the clipboard holds an image", () => {
      it("adds it to the card", async () => {
        const user = userEvent.setup()
        stubClipboardRead(async () => [
          clipboardItem("image/png", new Blob(["png-bytes"], { type: "image/png" })),
        ])
        renderNewCardPage()

        await user.click(
          screen.getByRole("button", { name: "クリップボードから画像を貼り付け" }),
        )

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
      })
    })

    describe("when the clipboard holds only text", () => {
      it("says there's no image to paste", async () => {
        const user = userEvent.setup()
        stubClipboardRead(async () => [
          clipboardItem("text/plain", new Blob(["猫"], { type: "text/plain" })),
        ])
        await renderSettledNewCardPage()

        await user.click(
          screen.getByRole("button", { name: "クリップボードから画像を貼り付け" }),
        )

        expect(
          await screen.findByText("クリップボードに画像がありません。"),
        ).toBeInTheDocument()
      })
    })

    describe("when reading the clipboard is refused", () => {
      it("says the clipboard couldn't be read", async () => {
        const user = userEvent.setup()
        stubClipboardRead(async () => {
          throw new DOMException("denied", "NotAllowedError")
        })
        await renderSettledNewCardPage()

        await user.click(
          screen.getByRole("button", { name: "クリップボードから画像を貼り付け" }),
        )

        expect(
          await screen.findByText("クリップボードを読み取れませんでした。"),
        ).toBeInTheDocument()
      })
    })
  })
})
