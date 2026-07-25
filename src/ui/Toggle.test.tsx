import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Toggle } from "./Toggle"

describe("Toggle", () => {
  it("renders the label and reflects the checked state", () => {
    render(<Toggle label="片面" checked={true} onChange={() => {}} />)
    expect(screen.getByText("片面")).toBeInTheDocument()
    expect(screen.getByRole("switch", { name: "片面" })).toBeChecked()
  })

  it("is unchecked when checked is false", () => {
    render(<Toggle label="両面" checked={false} onChange={() => {}} />)
    expect(screen.getByRole("switch", { name: "両面" })).not.toBeChecked()
  })

  it("calls onChange with the flipped value when clicked", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Toggle label="片面" checked={false} onChange={onChange} />)
    await user.click(screen.getByRole("switch", { name: "片面" }))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it("disables the switch when disabled", () => {
    render(<Toggle label="片面" checked={false} onChange={() => {}} disabled />)
    expect(screen.getByRole("switch", { name: "片面" })).toBeDisabled()
  })
})
