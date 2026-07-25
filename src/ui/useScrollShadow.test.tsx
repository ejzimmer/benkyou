import { describe, expect, it } from "vitest"
import { render, waitFor } from "@testing-library/react"
import { useScrollShadow } from "./useScrollShadow"

function TestBox() {
  const ref = useScrollShadow<HTMLDivElement>()
  return (
    <div ref={ref} data-testid="box">
      <div data-testid="disclosure" className="closed">
        content
      </div>
    </div>
  )
}

function mockScrollMetrics(
  el: HTMLElement,
  metrics: Partial<
    Record<
      | "scrollTop"
      | "scrollHeight"
      | "clientHeight"
      | "scrollLeft"
      | "scrollWidth"
      | "clientWidth",
      number
    >
  >,
) {
  for (const [key, value] of Object.entries(metrics)) {
    Object.defineProperty(el, key, { configurable: true, value })
  }
  el.dispatchEvent(new Event("scroll"))
}

describe("useScrollShadow", () => {
  it("applies no shadow when the content doesn't overflow", () => {
    const { getByTestId } = render(<TestBox />)
    const box = getByTestId("box")
    mockScrollMetrics(box, { scrollTop: 0, scrollHeight: 100, clientHeight: 100 })
    expect(box.style.boxShadow).toBe("")
  })

  function shadowCount(shadow: string): number {
    return (shadow.match(/inset/g) ?? []).length
  }

  it("shows only a bottom shadow at the top of scrollable content", () => {
    const { getByTestId } = render(<TestBox />)
    const box = getByTestId("box")
    mockScrollMetrics(box, { scrollTop: 0, scrollHeight: 300, clientHeight: 100 })
    expect(box.style.boxShadow).toContain("-8px")
    expect(shadowCount(box.style.boxShadow)).toBe(1)
  })

  it("shows both top and bottom shadows part way through", () => {
    const { getByTestId } = render(<TestBox />)
    const box = getByTestId("box")
    mockScrollMetrics(box, { scrollTop: 100, scrollHeight: 300, clientHeight: 100 })
    expect(shadowCount(box.style.boxShadow)).toBe(2)
  })

  it("shows only a top shadow at the bottom of scrollable content", () => {
    const { getByTestId } = render(<TestBox />)
    const box = getByTestId("box")
    mockScrollMetrics(box, { scrollTop: 200, scrollHeight: 300, clientHeight: 100 })
    const shadow = box.style.boxShadow
    expect(shadowCount(shadow)).toBe(1)
    expect(shadow).not.toContain("-8px")
  })

  it("shows a horizontal shadow independently of vertical state", () => {
    const { getByTestId } = render(<TestBox />)
    const box = getByTestId("box")
    mockScrollMetrics(box, {
      scrollTop: 0,
      scrollHeight: 100,
      clientHeight: 100,
      scrollLeft: 0,
      scrollWidth: 300,
      clientWidth: 100,
    })
    const shadow = box.style.boxShadow
    expect(shadowCount(shadow)).toBe(1)
    expect(shadow).toContain("8px 0")
  })

  // Mirrors a CSS disclosure (like the review prompt's "show meaning/images"
  // expander) that grows a container's scrollable content purely via a class
  // toggle on a descendant, with no nodes added/removed and no scroll event —
  // the toggle itself is what should be caught, not a following interaction.
  it("recomputes when a descendant's class changes with no node insertion", async () => {
    const { getByTestId } = render(<TestBox />)
    const box = getByTestId("box")
    const disclosure = getByTestId("disclosure")
    Object.defineProperty(box, "scrollTop", { configurable: true, value: 0 })
    Object.defineProperty(box, "scrollHeight", { configurable: true, value: 300 })
    Object.defineProperty(box, "clientHeight", { configurable: true, value: 100 })

    disclosure.className = "open"

    await waitFor(() => expect(box.style.boxShadow).toContain("-8px"))
  })

  it("recomputes on transitionend, after a CSS transition settles the size", async () => {
    const { getByTestId } = render(<TestBox />)
    const box = getByTestId("box")
    Object.defineProperty(box, "scrollTop", { configurable: true, value: 0 })
    Object.defineProperty(box, "scrollHeight", { configurable: true, value: 300 })
    Object.defineProperty(box, "clientHeight", { configurable: true, value: 100 })

    box.dispatchEvent(new Event("transitionend", { bubbles: true }))

    await waitFor(() => expect(box.style.boxShadow).toContain("-8px"))
  })
})
