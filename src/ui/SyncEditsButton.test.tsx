import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SyncEditsButton } from "./SyncEditsButton"
import { clearSessionEdits, markCardEdited } from "../lib/sync/sessionEdits"

const pushSessionEditsNow = vi.fn()
vi.mock("../services/decks", () => ({
  pushSessionEditsNow: (...args: unknown[]) => pushSessionEditsNow(...args),
}))

let mockAuth: { user: { uid: string } | null; offlineOnly: boolean } = {
  user: { uid: "u1" },
  offlineOnly: false,
}
vi.mock("../lib/auth/AuthContext", () => ({
  useAuth: () => mockAuth,
}))

describe("SyncEditsButton", () => {
  beforeEach(() => {
    clearSessionEdits()
    pushSessionEditsNow.mockReset()
    mockAuth = { user: { uid: "u1" }, offlineOnly: false }
  })

  it("renders nothing when there are no session edits", () => {
    render(<SyncEditsButton />)
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("shows the count of edited cards once something has been edited", () => {
    markCardEdited("card-1")
    markCardEdited("card-2")
    render(<SyncEditsButton />)
    expect(
      screen.getByRole("button", { name: /sync edits \(2\)/i }),
    ).toBeInTheDocument()
  })

  it("hides when offline-only, even with pending edits", () => {
    mockAuth = { user: { uid: "u1" }, offlineOnly: true }
    markCardEdited("card-1")
    render(<SyncEditsButton />)
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("hides when signed out, even with pending edits", () => {
    mockAuth = { user: null, offlineOnly: false }
    markCardEdited("card-1")
    render(<SyncEditsButton />)
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("pushes edits on click and disappears once the push clears them", async () => {
    markCardEdited("card-1")
    pushSessionEditsNow.mockImplementation(async () => {
      clearSessionEdits()
    })
    const user = userEvent.setup()
    render(<SyncEditsButton />)

    await user.click(screen.getByRole("button", { name: /sync edits/i }))

    expect(pushSessionEditsNow).toHaveBeenCalledWith({ uid: "u1" })
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("shows the push error and keeps the button (edits are still pending)", async () => {
    markCardEdited("card-1")
    pushSessionEditsNow.mockRejectedValue(new Error("network down"))
    const user = userEvent.setup()
    render(<SyncEditsButton />)

    await user.click(screen.getByRole("button", { name: /sync edits/i }))

    expect(await screen.findByText("network down")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /sync edits/i })).toBeInTheDocument()
  })
})
