import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CardImage } from "./CardImage"

const getImageUrl = vi.fn()
vi.mock("../services/media", () => ({
  getImageUrl: (...args: unknown[]) => getImageUrl(...args),
}))

let mockAuth: { user: { uid: string } | null; offlineOnly: boolean } = {
  user: { uid: "u1" },
  offlineOnly: false,
}
vi.mock("../lib/auth/AuthContext", () => ({
  useAuth: () => mockAuth,
}))

describe("CardImage", () => {
  beforeEach(() => {
    getImageUrl.mockReset()
    mockAuth = { user: { uid: "u1" }, offlineOnly: false }
    // jsdom doesn't implement revokeObjectURL; the component calls it on
    // unmount/re-fetch for real browsers' sake.
    URL.revokeObjectURL = vi.fn()
  })

  it("shows a sync button alongside the missing-image message when signed in", async () => {
    getImageUrl.mockResolvedValue(null)
    render(<CardImage mediaId="m1" />)

    await waitFor(() => {
      expect(screen.getByText("画像が見つかりません")).toBeInTheDocument()
    })
    expect(screen.getByRole("button", { name: "画像を同期" })).toBeInTheDocument()
  })

  it("omits the sync button when offline-only", async () => {
    mockAuth = { user: null, offlineOnly: true }
    getImageUrl.mockResolvedValue(null)
    render(<CardImage mediaId="m1" />)

    await waitFor(() => {
      expect(screen.getByText("画像が見つかりません")).toBeInTheDocument()
    })
    expect(screen.queryByRole("button", { name: "画像を同期" })).not.toBeInTheDocument()
  })

  it("retries fetching just this image and shows it once the sync succeeds", async () => {
    const user = userEvent.setup()
    getImageUrl.mockResolvedValueOnce(null)
    const { container } = render(<CardImage mediaId="m1" />)

    const button = await screen.findByRole("button", { name: "画像を同期" })

    getImageUrl.mockResolvedValueOnce("blob:found")
    await user.click(button)

    await waitFor(() => {
      expect(container.querySelector("img")).toHaveAttribute("src", "blob:found")
    })
    expect(getImageUrl).toHaveBeenLastCalledWith("m1", mockAuth.user)
  })
})
