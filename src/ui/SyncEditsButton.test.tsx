import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SyncEditsButton } from "./SyncEditsButton"
import { clearSessionEdits, markCardEdited } from "../lib/sync/sessionEdits"

const syncEditsNow = vi.fn()

let mockAuth: { user: { uid: string } | null; offlineOnly: boolean } = {
  user: { uid: "u1" },
  offlineOnly: false,
}
vi.mock("../lib/auth/AuthContext", () => ({
  useAuth: () => mockAuth,
}))

let mockSyncing = false
vi.mock("../lib/sync/SyncContext", () => ({
  useSync: () => ({
    syncEditsNow: (...args: unknown[]) => syncEditsNow(...args),
    syncing: mockSyncing,
  }),
}))

describe("SyncEditsButton", () => {
  beforeEach(() => {
    clearSessionEdits()
    syncEditsNow.mockReset()
    mockAuth = { user: { uid: "u1" }, offlineOnly: false }
    mockSyncing = false
  })

  it("shows a plain white 'Sync' button when there are no session edits", () => {
    render(<SyncEditsButton />)
    const button = screen.getByRole("button", { name: /^sync$/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass("btn", "secondary", "white")
    expect(button).not.toHaveClass("green")
  })

  it("shows the count of edited cards and turns green once something has been edited", () => {
    markCardEdited("card-1")
    markCardEdited("card-2")
    render(<SyncEditsButton />)
    const button = screen.getByRole("button", { name: /sync \(2\)/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass("btn", "secondary", "green")
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

  it("is disabled while a sync/push/sync-edits operation is already in flight, showing a spinner instead of text", () => {
    mockSyncing = true
    markCardEdited("card-1")
    render(<SyncEditsButton />)
    const button = screen.getByRole("button", { name: /syncing/i })
    expect(button).toBeDisabled()
    expect(button.querySelector(".import-spinner")).toBeInTheDocument()
    expect(button).not.toHaveTextContent(/sync \(1\)/i)
  })

  it("calls syncEditsNow (which shares SyncContext's in-flight guard) on click and reverts to the plain white state once it clears the edits", async () => {
    markCardEdited("card-1")
    syncEditsNow.mockImplementation(async () => {
      clearSessionEdits()
    })
    const user = userEvent.setup()
    render(<SyncEditsButton />)

    await user.click(screen.getByRole("button", { name: /sync \(1\)/i }))

    expect(syncEditsNow).toHaveBeenCalledTimes(1)
    const button = screen.getByRole("button", { name: /^sync$/i })
    expect(button).toHaveClass("white")
    expect(button).not.toHaveClass("green")
  })

  it("shows the push error and keeps the button (edits are still pending)", async () => {
    markCardEdited("card-1")
    syncEditsNow.mockRejectedValue(new Error("network down"))
    const user = userEvent.setup()
    render(<SyncEditsButton />)

    await user.click(screen.getByRole("button", { name: /sync \(1\)/i }))

    expect(await screen.findByText("network down")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /sync \(1\)/i })).toBeInTheDocument()
  })

  it("renders as a plain in-flow item instead of the fixed banner when inline", () => {
    const { container } = render(<SyncEditsButton inline />)
    expect(container.querySelector(".sync-edits-banner")).not.toBeInTheDocument()
    expect(container.querySelector(".sync-edits-inline")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^sync$/i })).toBeInTheDocument()
  })
})
