import { describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { AuthProvider } from "../../lib/auth/AuthContext"
import { ReviewSessionPage } from "./ReviewSessionPage"
import type { DueItem } from "../../services/review"
import type { Card } from "../../domain/types"

vi.mock("../../lib/firebase", () => ({
  getFirebaseApp: () => null,
  getFirestoreDb: () => null,
  isFirebaseConfigured: () => false,
}))

const dueItemFor = (word: string): DueItem => ({
  card: {
    id: "card-1",
    deckId: "deck-1",
    kind: "vocabulary",
    content: {
      wordJa: word,
      reading: "よみ",
      definitionsEn: ["def"],
      images: [],
      exampleSentences: [],
      synonymsJa: [],
    },
    updatedAt: Date.now(),
  } satisfies Card,
  modeId: "vocab_oral_en",
  due: 0,
})

const getDueQueue = vi.fn()
vi.mock("../../services/review", () => ({
  getDueQueue: (...args: unknown[]) => getDueQueue(...args),
  prepareJudgement: vi.fn(),
  commitJudgement: vi.fn(),
  restoreSchedulingSnapshot: vi.fn(),
  undoLastJudgement: vi.fn(),
}))

// The version bumps once a mid-session sync resolves a conflict; the review
// page should re-fetch the due queue rather than keep showing stale data.
let conflictResolutionVersion = 0
vi.mock("../../lib/sync/SyncContext", () => ({
  useSync: () => ({
    initialSyncComplete: true,
    syncProgress: null,
    syncStatusLabel: "",
    conflictResolutionVersion,
  }),
}))

describe("ReviewSessionPage conflict reload", () => {
  it("reloads the due queue when a mid-session conflict resolves", async () => {
    conflictResolutionVersion = 0
    getDueQueue.mockResolvedValueOnce([dueItemFor("猫")])

    const { rerender } = render(
      <MemoryRouter initialEntries={["/review"]}>
        <AuthProvider>
          <Routes>
            <Route path="/review" element={<ReviewSessionPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    await screen.findByText("猫")
    expect(getDueQueue).toHaveBeenCalledTimes(1)

    // Simulate a conflict resolving mid-session with a merged card version.
    getDueQueue.mockResolvedValueOnce([dueItemFor("犬")])
    conflictResolutionVersion = 1

    rerender(
      <MemoryRouter initialEntries={["/review"]}>
        <AuthProvider>
          <Routes>
            <Route path="/review" element={<ReviewSessionPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => expect(getDueQueue).toHaveBeenCalledTimes(2))
    expect(await screen.findByText("犬")).toBeInTheDocument()
  })
})
