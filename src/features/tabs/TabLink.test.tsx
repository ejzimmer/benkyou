import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { TabLink } from "./TabLink"

describe("TabLink", () => {
  describe("with reviews ready", () => {
    it("shows how many", () => {
      render(
        <MemoryRouter>
          <TabLink path="/cards" label="Cards" isActive={false} reviewCount={24} />
        </MemoryRouter>,
      )

      expect(screen.getByRole("link", { name: "Cards 24 reviews ready" })).toBeInTheDocument()
    })
  })

  describe("with no reviews ready", () => {
    it("shows just the tab's name", () => {
      render(
        <MemoryRouter>
          <TabLink path="/cards" label="Cards" isActive={false} reviewCount={0} />
        </MemoryRouter>,
      )

      expect(screen.getByRole("link")).toHaveAccessibleName("Cards")
    })
  })
})
