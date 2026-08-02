import { useState } from "react"
import { describe, expect, it } from "vitest"
import { fireEvent, render } from "@testing-library/react"
import { useFocusTrap } from "./useFocusTrap"

function TestPanel() {
  const ref = useFocusTrap<HTMLDivElement>()
  return (
    <div ref={ref} data-testid="panel">
      <button type="button" data-testid="first">
        first
      </button>
      <button type="button" data-testid="last">
        last
      </button>
    </div>
  )
}

function TestModal() {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button type="button" data-testid="outside">
        outside
      </button>
      <button type="button" data-testid="trigger" onClick={() => setOpen(true)}>
        trigger
      </button>
      {open && (
        <div data-testid="backdrop">
          <TestPanel />
          <button
            type="button"
            data-testid="close"
            onClick={() => setOpen(false)}
          >
            close
          </button>
        </div>
      )}
    </div>
  )
}

describe("useFocusTrap", () => {
  it("moves focus into the panel on mount", () => {
    const { getByTestId } = render(<TestPanel />)
    expect(document.activeElement).toBe(getByTestId("first"))
  })

  it("wraps Tab from the last focusable element back to the first", () => {
    const { getByTestId } = render(<TestPanel />)
    getByTestId("last").focus()
    fireEvent.keyDown(document, { key: "Tab" })
    expect(document.activeElement).toBe(getByTestId("first"))
  })

  it("wraps Shift+Tab from the first focusable element back to the last", () => {
    const { getByTestId } = render(<TestPanel />)
    getByTestId("first").focus()
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true })
    expect(document.activeElement).toBe(getByTestId("last"))
  })

  it("pulls focus back into the panel if it escapes to the page behind it", () => {
    const { getByTestId } = render(
      <div>
        <button type="button" data-testid="outside">
          outside
        </button>
        <TestPanel />
      </div>,
    )
    getByTestId("outside").focus()
    fireEvent.keyDown(document, { key: "Tab" })
    expect(document.activeElement).toBe(getByTestId("first"))
  })

  it("restores focus to the trigger element once the modal unmounts", () => {
    const { getByTestId } = render(<TestModal />)

    getByTestId("trigger").focus()
    fireEvent.click(getByTestId("trigger"))
    expect(document.activeElement).toBe(getByTestId("first"))

    fireEvent.click(getByTestId("close"))
    expect(document.activeElement).toBe(getByTestId("trigger"))
  })
})
