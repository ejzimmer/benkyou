import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SyncButton } from "./SyncButton"

const syncNow = vi.fn()

let mockAuth: { user: { uid: string } | null; offlineOnly: boolean } = {
  user: { uid: "u1" },
  offlineOnly: false,
}
vi.mock("../lib/auth/AuthContext", () => ({
  useAuth: () => mockAuth,
}))

let mockSync = { syncing: false, conflictActive: false, lastSyncedAt: null as number | null }
vi.mock("../lib/sync/SyncContext", () => ({
  useSync: () => ({
    syncNow: (...args: unknown[]) => syncNow(...args),
    ...mockSync,
  }),
}))

describe("SyncButton", () => {
  beforeEach(() => {
    syncNow.mockReset()
    mockAuth = { user: { uid: "u1" }, offlineOnly: false }
    mockSync = { syncing: false, conflictActive: false, lastSyncedAt: null }
  })

  it("shows a plain 'Sync' button", () => {
    render(<SyncButton />)
    const button = screen.getByRole("button", { name: /^sync$/i })
    expect(button).toBeInTheDocument()
    expect(button).not.toBeDisabled()
  })

  it("hides when offline-only", () => {
    mockAuth = { user: { uid: "u1" }, offlineOnly: true }
    render(<SyncButton />)
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("hides when signed out", () => {
    mockAuth = { user: null, offlineOnly: false }
    render(<SyncButton />)
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("is disabled and shows a spinner while syncing", () => {
    mockSync = { syncing: true, conflictActive: false, lastSyncedAt: null }
    render(<SyncButton />)
    const button = screen.getByRole("button", { name: /syncing/i })
    expect(button).toBeDisabled()
    expect(button.querySelector(".import-spinner")).toBeInTheDocument()
  })

  it("is disabled and labelled to resolve a conflict when one is active", () => {
    mockSync = { syncing: false, conflictActive: true, lastSyncedAt: null }
    render(<SyncButton />)
    const button = screen.getByRole("button", { name: /resolve conflict/i })
    expect(button).toBeDisabled()
  })

  it("calls syncNow on click", async () => {
    const user = userEvent.setup()
    render(<SyncButton />)

    await user.click(screen.getByRole("button", { name: /^sync$/i }))

    expect(syncNow).toHaveBeenCalledTimes(1)
  })

  it("shows the sync error", async () => {
    syncNow.mockRejectedValue(new Error("network down"))
    const user = userEvent.setup()
    render(<SyncButton />)

    await user.click(screen.getByRole("button", { name: /^sync$/i }))

    expect(await screen.findByText("network down")).toBeInTheDocument()
  })

  it("renders as a plain in-flow item", () => {
    const { container } = render(<SyncButton />)
    expect(container.querySelector(".sync-inline")).toBeInTheDocument()
  })
})
