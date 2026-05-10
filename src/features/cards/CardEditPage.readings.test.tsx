import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { AuthProvider } from "../../lib/auth/AuthContext"
import { SyncProvider } from "../../lib/sync/SyncContext"
import { CardEditPage } from "./CardEditPage"

vi.mock("../../lib/firebase", () => ({
  getFirebaseApp: () => null,
  getFirestoreDb: () => null,
  isFirebaseConfigured: () => false,
}))

vi.mock("../../lib/sync/firestoreSync", () => ({
  upsertDeckRemote: vi.fn(),
  upsertCardRemote: vi.fn(),
  upsertSchedulingRemote: vi.fn(),
}))

function wrap(ui: JSX.Element) {
  return (
    <MemoryRouter initialEntries={["/decks/d1/cards/new?vocab=0"]}>
      <AuthProvider>
        <SyncProvider>
          <Routes>
            <Route path="/decks/:deckId/cards/new" element={ui} />
          </Routes>
        </SyncProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}

describe("CardEditPage grammar readings draft", () => {
  it("keeps textarea content while typing before '=' appears", async () => {
    const user = userEvent.setup()
    render(wrap(<CardEditPage />))

    const ta = screen.getByRole("textbox", { name: /kanji to reading map/i })
    await user.type(ta, "私")
    expect(ta).toHaveValue("私")
    await user.type(ta, "=")
    expect(ta).toHaveValue("私=")
    await user.type(ta, "わたし")
    expect(ta).toHaveValue("私=わたし")
  })
})
