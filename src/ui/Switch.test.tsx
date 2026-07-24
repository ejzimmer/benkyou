import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Switch } from "./Switch"

describe("Switch", () => {
  it("renders both options, each clearly labelled", () => {
    render(
      <Switch
        legend="Type"
        name="card-kind"
        value="vocabulary"
        onChange={() => {}}
        options={[
          { value: "vocabulary", label: "Vocabulary" },
          { value: "grammar", label: "Grammar" },
        ]}
      />,
    )
    const group = screen.getByRole("group", { name: "Type" })
    expect(group).toBeInTheDocument()
    expect(screen.getByText("Vocabulary")).toBeInTheDocument()
    expect(screen.getByText("Grammar")).toBeInTheDocument()
  })

  it("marks only the current value as checked, not a fixed side", () => {
    render(
      <Switch
        legend="Type"
        name="card-kind"
        value="grammar"
        onChange={() => {}}
        options={[
          { value: "vocabulary", label: "Vocabulary" },
          { value: "grammar", label: "Grammar" },
        ]}
      />,
    )
    expect(screen.getByRole("radio", { name: "Vocabulary" })).not.toBeChecked()
    expect(screen.getByRole("radio", { name: "Grammar" })).toBeChecked()
  })

  it("calls onChange with the other option's value when clicked", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <Switch
        legend="Type"
        name="card-kind"
        value="vocabulary"
        onChange={onChange}
        options={[
          { value: "vocabulary", label: "Vocabulary" },
          { value: "grammar", label: "Grammar" },
        ]}
      />,
    )
    await user.click(screen.getByText("Grammar"))
    expect(onChange).toHaveBeenCalledWith("grammar")
  })

  it("marks only the selected option's button as pressed", () => {
    const { rerender } = render(
      <Switch
        legend="Type"
        name="card-kind"
        value="vocabulary"
        onChange={() => {}}
        options={[
          { value: "vocabulary", label: "Vocabulary" },
          { value: "grammar", label: "Grammar" },
        ]}
      />,
    )
    expect(screen.getByText("Vocabulary")).toHaveClass("switch-option-selected")
    expect(screen.getByText("Grammar")).not.toHaveClass(
      "switch-option-selected",
    )

    rerender(
      <Switch
        legend="Type"
        name="card-kind"
        value="grammar"
        onChange={() => {}}
        options={[
          { value: "vocabulary", label: "Vocabulary" },
          { value: "grammar", label: "Grammar" },
        ]}
      />,
    )
    expect(screen.getByText("Vocabulary")).not.toHaveClass(
      "switch-option-selected",
    )
    expect(screen.getByText("Grammar")).toHaveClass("switch-option-selected")
  })

  it("disables both options when disabled", () => {
    render(
      <Switch
        legend="Type"
        name="card-kind"
        value="vocabulary"
        onChange={() => {}}
        disabled
        options={[
          { value: "vocabulary", label: "Vocabulary" },
          { value: "grammar", label: "Grammar" },
        ]}
      />,
    )
    expect(screen.getByRole("radio", { name: "Vocabulary" })).toBeDisabled()
    expect(screen.getByRole("radio", { name: "Grammar" })).toBeDisabled()
  })
})
