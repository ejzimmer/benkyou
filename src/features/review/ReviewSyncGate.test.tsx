import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { ReviewSyncGate } from "./ReviewSyncGate"

describe("ReviewSyncGate", () => {
  it("shows the phase and how many images remain", () => {
    render(
      <MemoryRouter>
        <ReviewSyncGate
          progress={{ phase: "Downloading images…", current: 3, total: 10 }}
          statusLabel=""
          backTo="/"
        />
      </MemoryRouter>,
    )
    expect(
      screen.getByText(/getting your latest cards/i),
    ).toBeInTheDocument()
    expect(screen.getByText("Downloading images…")).toBeInTheDocument()
    expect(screen.getByText(/7 images left/i)).toBeInTheDocument()
  })

  it("falls back to the status label when there is no structured progress", () => {
    render(
      <MemoryRouter>
        <ReviewSyncGate
          progress={null}
          statusLabel="merge decks/cards/scheduling"
          backTo="/"
        />
      </MemoryRouter>,
    )
    expect(
      screen.getByText("merge decks/cards/scheduling"),
    ).toBeInTheDocument()
  })
})
