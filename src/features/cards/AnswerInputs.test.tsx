import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { AnswerInputs } from "./AnswerInputs"

function Harness({ initial = [] as string[] }) {
  const [main, setMain] = useState("猫")
  const [alternates, setAlternates] = useState(initial)
  return (
    <>
      <AnswerInputs
        label="日本語で"
        renderPrimaryInput={(id) => (
          <input id={id} value={main} onChange={(e) => setMain(e.target.value)} />
        )}
        alternates={alternates}
        onAlternatesChange={setAlternates}
      />
      <output>{JSON.stringify(alternates)}</output>
    </>
  )
}

describe("AnswerInputs", () => {
  it("labels the main input and starts with only a + button", () => {
    render(<Harness />)
    expect(screen.getByLabelText("日本語で")).toHaveValue("猫")
    expect(screen.getAllByRole("button", { name: "答えを追加" })).toHaveLength(1)
    expect(screen.queryByRole("button", { name: /削除/ })).not.toBeInTheDocument()
  })

  it("adds a focused input under the last one, keeping + on the last row only", async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole("button", { name: "答えを追加" }))
    const second = screen.getByLabelText("日本語で（2）")
    expect(second).toHaveFocus()
    await user.type(second, "ねこ")
    await user.click(screen.getByRole("button", { name: "答えを追加" }))
    expect(screen.getByLabelText("日本語で（3）")).toHaveFocus()

    const rows = document.querySelectorAll(".answer-input-row")
    expect(rows).toHaveLength(3)
    expect(screen.getAllByRole("button", { name: "答えを追加" })).toHaveLength(1)
    expect(rows[2].querySelector('[aria-label="答えを追加"]')).not.toBeNull()
  })

  it("× removes that input and its contents", async () => {
    const user = userEvent.setup()
    render(<Harness initial={["ねこ", "ネコ"]} />)
    await user.click(screen.getByRole("button", { name: "日本語で（2）を削除" }))
    expect(screen.getByLabelText("日本語で（2）")).toHaveValue("ネコ")
    expect(screen.queryByLabelText("日本語で（3）")).not.toBeInTheDocument()
    expect(document.querySelector("output")?.textContent).toBe('["ネコ"]')
  })

  it("moves focus to the input above when × removes a row", async () => {
    const user = userEvent.setup()
    render(<Harness initial={["ねこ", "ネコ"]} />)
    await user.click(screen.getByRole("button", { name: "日本語で（3）を削除" }))
    expect(screen.getByLabelText("日本語で（2）")).toHaveFocus()
    await user.click(screen.getByRole("button", { name: "日本語で（2）を削除" }))
    expect(screen.getByLabelText("日本語で")).toHaveFocus()
  })
})
