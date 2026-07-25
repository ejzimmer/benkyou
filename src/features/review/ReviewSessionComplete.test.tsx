import { render } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import { ReviewSessionComplete } from "./ReviewSessionComplete"

const syncEditsNow = vi.fn(async () => {})

vi.mock("../../lib/sync/SyncContext", () => ({
  useSync: () => ({ syncEditsNow }),
}))

vi.mock("../../lib/auth/AuthContext", () => ({
  useAuth: () => ({ user: null, offlineOnly: true }),
}))

describe("ReviewSessionComplete", () => {
  it("pushes pending judgements automatically once, on reaching the finished screen", () => {
    render(
      <MemoryRouter>
        <ReviewSessionComplete backTo="/" onUndoLastJudgement={() => {}} />
      </MemoryRouter>,
    )

    expect(syncEditsNow).toHaveBeenCalledTimes(1)
  })

  it("does not push again on a re-render that doesn't remount the screen", () => {
    syncEditsNow.mockClear()
    const { rerender } = render(
      <MemoryRouter>
        <ReviewSessionComplete backTo="/" onUndoLastJudgement={() => {}} />
      </MemoryRouter>,
    )
    expect(syncEditsNow).toHaveBeenCalledTimes(1)

    rerender(
      <MemoryRouter>
        <ReviewSessionComplete backTo="/decks/1" onUndoLastJudgement={() => {}} />
      </MemoryRouter>,
    )

    expect(syncEditsNow).toHaveBeenCalledTimes(1)
  })
})
