import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { AuthProvider } from "../../lib/auth/AuthContext"
import { SyncProvider } from "../../lib/sync/SyncContext"
import { StatsPage } from "./StatsPage"
import { resetDatabase } from "../../test/db"
import { db } from "../../lib/db/schema"
import { newId } from "../../lib/db/id"

vi.mock("../../lib/firebase", () => ({
  getFirebaseApp: () => null,
  getFirestoreDb: () => null,
  isFirebaseConfigured: () => false,
}))

function renderStatsPage() {
  render(
    <MemoryRouter initialEntries={["/stats"]}>
      <AuthProvider>
        <SyncProvider>
          <Routes>
            <Route path="/stats" element={<StatsPage />} />
          </Routes>
        </SyncProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe("StatsPage", () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it("shows an empty-state message when no timing samples exist", async () => {
    renderStatsPage()

    await waitFor(() => {
      expect(screen.getByText(/まだデータがありません/)).toBeInTheDocument()
    })
  })

  it("shows a per-mode breakdown once timing samples exist", async () => {
    await db.timingSamples.bulkPut([
      { id: newId(), ts: 1, modeId: "vocab_type_reading", responseMs: 2000, correct: true },
      { id: newId(), ts: 2, modeId: "vocab_type_reading", responseMs: 4000, correct: true },
      { id: newId(), ts: 3, modeId: "vocab_type_reading", responseMs: 9000, correct: false },
    ])

    renderStatsPage()

    await waitFor(() => {
      expect(screen.getByText(/合計3件のサンプル/)).toBeInTheDocument()
    })
    expect(screen.getByText("読み方を入力")).toBeInTheDocument()
    expect(screen.getByText("67%")).toBeInTheDocument()
    expect(screen.getAllByText("3.0秒")).toHaveLength(2)
  })
})
