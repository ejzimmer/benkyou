import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { AuthProvider } from "../../lib/auth/AuthContext"
import { ReviewSessionPage } from "./ReviewSessionPage"

vi.mock("../../lib/firebase", () => ({
  getFirebaseApp: () => null,
  getFirestoreDb: () => null,
  isFirebaseConfigured: () => false,
}))

// Force "initial sync not yet finished" so the gate is shown.
vi.mock("../../lib/sync/SyncContext", () => ({
  useSync: () => ({
    initialSyncComplete: false,
    syncProgress: { phase: "Downloading images…", current: 2, total: 8 },
    syncStatusLabel: "",
  }),
}))

describe("ReviewSessionPage sync gate", () => {
  it("holds the review behind the sync gate until the first sync finishes", async () => {
    render(
      <MemoryRouter initialEntries={["/review"]}>
        <AuthProvider>
          <Routes>
            <Route path="/review" element={<ReviewSessionPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(
      await screen.findByText(/getting your latest cards/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/6 images left/i)).toBeInTheDocument()
    // The review itself is not shown yet.
    expect(
      screen.queryByRole("button", { name: /show answer/i }),
    ).not.toBeInTheDocument()
  })
})
