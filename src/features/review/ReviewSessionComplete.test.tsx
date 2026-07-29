import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ReviewSessionComplete } from "./ReviewSessionComplete"
import {
  incrementReviewedCount,
  resumeReviewSessionTimerIfPresent,
  startReviewSessionTimer,
} from "./reviewSessionTimer"

const syncEditsNow = vi.fn(async () => {})

vi.mock("../../lib/sync/SyncContext", () => ({
  useSync: () => ({ syncEditsNow }),
}))

vi.mock("../../lib/auth/AuthContext", () => ({
  useAuth: () => ({ user: null, offlineOnly: true }),
}))

describe("ReviewSessionComplete", () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("shows the rounded elapsed minutes and reviewed count from the session timer", () => {
    startReviewSessionTimer("deck-1")
    for (let i = 0; i < 12; i++) incrementReviewedCount("deck-1")
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 3 * 60_000 + 20_000)

    render(
      <MemoryRouter>
        <ReviewSessionComplete backTo="/" scopeKey="deck-1" onUndoLastJudgement={() => {}} />
      </MemoryRouter>,
    )

    expect(screen.getByText("3分で12枚を復習しました")).toBeInTheDocument()
  })

  it('clears the scope\'s session timer when leaving via the "ホーム" link', async () => {
    const user = userEvent.setup()
    startReviewSessionTimer("deck-1")
    incrementReviewedCount("deck-1")
    expect(resumeReviewSessionTimerIfPresent("deck-1")).toBe(true)

    render(
      <MemoryRouter>
        <ReviewSessionComplete backTo="/" scopeKey="deck-1" onUndoLastJudgement={() => {}} />
      </MemoryRouter>,
    )
    await user.click(screen.getByRole("link", { name: "ホーム" }))

    expect(resumeReviewSessionTimerIfPresent("deck-1")).toBe(false)
  })

  it('clears the scope\'s session timer when leaving via the back chevron', async () => {
    const user = userEvent.setup()
    startReviewSessionTimer("deck-1")
    incrementReviewedCount("deck-1")

    render(
      <MemoryRouter>
        <ReviewSessionComplete backTo="/" scopeKey="deck-1" onUndoLastJudgement={() => {}} />
      </MemoryRouter>,
    )
    await user.click(screen.getByRole("link", { name: "Exit review" }))

    expect(resumeReviewSessionTimerIfPresent("deck-1")).toBe(false)
  })

  it("pushes pending judgements automatically once, on reaching the finished screen", () => {
    render(
      <MemoryRouter>
        <ReviewSessionComplete backTo="/" scopeKey="all" onUndoLastJudgement={() => {}} />
      </MemoryRouter>,
    )

    expect(syncEditsNow).toHaveBeenCalledTimes(1)
  })

  it("does not push again on a re-render that doesn't remount the screen", () => {
    syncEditsNow.mockClear()
    const { rerender } = render(
      <MemoryRouter>
        <ReviewSessionComplete backTo="/" scopeKey="all" onUndoLastJudgement={() => {}} />
      </MemoryRouter>,
    )
    expect(syncEditsNow).toHaveBeenCalledTimes(1)

    rerender(
      <MemoryRouter>
        <ReviewSessionComplete backTo="/decks/1" scopeKey="all" onUndoLastJudgement={() => {}} />
      </MemoryRouter>,
    )

    expect(syncEditsNow).toHaveBeenCalledTimes(1)
  })
})
