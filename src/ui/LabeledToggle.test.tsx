import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { LabeledToggle } from "./LabeledToggle"

describe("LabeledToggle", () => {
  it("renders both option labels", () => {
    render(
      <LabeledToggle
        legend="Testing"
        name="grammar-sides"
        value="both"
        onChange={() => {}}
        options={[
          { value: "both", label: "両面" },
          { value: "one", label: "片面" },
        ]}
      />,
    )
    expect(screen.getByText("両面")).toBeInTheDocument()
    expect(screen.getByText("片面")).toBeInTheDocument()
  })

  it("is unchecked when value matches the first option", () => {
    render(
      <LabeledToggle
        legend="Testing"
        name="grammar-sides"
        value="both"
        onChange={() => {}}
        options={[
          { value: "both", label: "両面" },
          { value: "one", label: "片面" },
        ]}
      />,
    )
    expect(screen.getByRole("switch", { name: "Testing" })).not.toBeChecked()
  })

  it("is checked when value matches the second option", () => {
    render(
      <LabeledToggle
        legend="Testing"
        name="grammar-sides"
        value="one"
        onChange={() => {}}
        options={[
          { value: "both", label: "両面" },
          { value: "one", label: "片面" },
        ]}
      />,
    )
    expect(screen.getByRole("switch", { name: "Testing" })).toBeChecked()
  })

  it("marks only the selected option's label", () => {
    render(
      <LabeledToggle
        legend="Testing"
        name="grammar-sides"
        value="both"
        onChange={() => {}}
        options={[
          { value: "both", label: "両面" },
          { value: "one", label: "片面" },
        ]}
      />,
    )
    expect(screen.getByText("両面")).toHaveClass(
      "labeled-toggle-option-selected",
    )
    expect(screen.getByText("片面")).not.toHaveClass(
      "labeled-toggle-option-selected",
    )
  })

  it("calls onChange with the other option's value when clicked", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <LabeledToggle
        legend="Testing"
        name="grammar-sides"
        value="both"
        onChange={onChange}
        options={[
          { value: "both", label: "両面" },
          { value: "one", label: "片面" },
        ]}
      />,
    )
    await user.click(screen.getByRole("switch", { name: "Testing" }))
    expect(onChange).toHaveBeenCalledWith("one")
  })

  it("disables the switch when disabled", () => {
    render(
      <LabeledToggle
        legend="Testing"
        name="grammar-sides"
        value="both"
        onChange={() => {}}
        disabled
        options={[
          { value: "both", label: "両面" },
          { value: "one", label: "片面" },
        ]}
      />,
    )
    expect(screen.getByRole("switch", { name: "Testing" })).toBeDisabled()
  })
})
