import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { SyncProgressIndicator } from "./SyncProgressIndicator"

describe("SyncProgressIndicator", () => {
  describe("while images are syncing", () => {
    it("marks the images stage as the current one", () => {
      render(
        <SyncProgressIndicator progress={{ stage: "images", fraction: 0.5 }} />,
      )

      expect(screen.getByRole("listitem", { name: "画像" })).toHaveAttribute(
        "aria-current",
        "step",
      )
    })

    it("marks the cards stage as done", () => {
      render(
        <SyncProgressIndicator progress={{ stage: "images", fraction: 0.5 }} />,
      )

      expect(screen.getByRole("listitem", { name: "カード" })).toHaveClass(
        "done",
      )
    })

    it("marks the upload stage as still to come", () => {
      render(
        <SyncProgressIndicator progress={{ stage: "images", fraction: 0.5 }} />,
      )

      expect(
        screen.getByRole("listitem", { name: "アップロード" }),
      ).toHaveClass("pending")
    })

    it("fills the bar to how far through the images it is", () => {
      render(
        <SyncProgressIndicator
          progress={{ stage: "images", fraction: 0.42 }}
        />,
      )

      expect(screen.getByRole("progressbar", { name: "画像" })).toHaveAttribute(
        "aria-valuenow",
        "42",
      )
    })
  })

  describe("when the stage's size isn't known yet", () => {
    it("shows an indeterminate bar", () => {
      render(
        <SyncProgressIndicator progress={{ stage: "cards", fraction: null }} />,
      )

      const bar = screen.getByRole("progressbar", { name: "カード" })
      expect(bar).toHaveClass("indeterminate")
      expect(bar).not.toHaveAttribute("aria-valuenow")
    })
  })
})
