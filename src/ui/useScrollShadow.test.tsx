import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { useScrollShadow } from "./useScrollShadow"

function TestBox() {
  const ref = useScrollShadow<HTMLDivElement>()
  return (
    <div ref={ref} data-testid="box">
      content
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
})
