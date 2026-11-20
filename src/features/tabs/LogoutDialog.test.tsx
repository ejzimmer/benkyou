import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { LogoutDialog } from "./LogoutDialog"

function renderOpenDialog() {
  const onLogOut = vi.fn()
  render(
    <LogoutDialog
      ref={(dialog) => dialog?.setAttribute("open", "")}
      onLogOut={onLogOut}
      onCancel={() => {}}
    />,
  )
  return { onLogOut }
}

describe("LogoutDialog", () => {
  describe("when logging out with both switches left on", () => {
    it("logs out of WaniKani and Google", async () => {
      const { onLogOut } = renderOpenDialog()

      await userEvent.click(screen.getByRole("button", { name: "Log out" }))

      expect(onLogOut).toHaveBeenCalledWith({
        shouldDeleteApiKey: true,
        shouldLogOutOfGoogle: true,
      })
    })
  })

  describe("when the Google switch is turned off", () => {
    it("only deletes the WaniKani API key", async () => {
      const { onLogOut } = renderOpenDialog()

      await userEvent.click(screen.getByRole("switch", { name: "Log out of Google" }))
      await userEvent.click(screen.getByRole("button", { name: "Log out" }))

      expect(onLogOut).toHaveBeenCalledWith({
        shouldDeleteApiKey: true,
        shouldLogOutOfGoogle: false,
      })
    })
  })

  describe("when both switches are turned off", () => {
    it("can't log out of anything", async () => {
      renderOpenDialog()

      await userEvent.click(screen.getByRole("switch", { name: "Delete WaniKani API key" }))
      await userEvent.click(screen.getByRole("switch", { name: "Log out of Google" }))

      expect(screen.getByRole("button", { name: "Log out" })).toBeDisabled()
    })
  })
})
