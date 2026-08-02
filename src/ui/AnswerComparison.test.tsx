import { describe, expect, it } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { AnswerComparison } from "./AnswerComparison"

describe("AnswerComparison", () => {
  it("shows only the correct answer when right", () => {
    render(<AnswerComparison typed="ねこ" expected="ねこ" />)
    const group = screen.getByRole("group", { name: "答え" })
    expect(within(group).getByText("正解")).toBeInTheDocument()
    expect(within(group).getByText("正解です")).toBeInTheDocument()
    expect(within(group).queryByText("あなたの答え")).not.toBeInTheDocument()
    expect(within(group).getByText("ねこ")).toBeInTheDocument()
  })

  it("stacks correct over yours with aligned, highlighted diffs when wrong", () => {
    render(<AnswerComparison typed="しゅかん" expected="しゅんかん" />)
    const group = screen.getByRole("group", { name: "答えの比較" })
    const correct = group.querySelector('[data-reading-diff-line="correct"]')!
    const yours = group.querySelector('[data-reading-diff-line="yours"]')!

    expect(correct).toHaveTextContent("しゅんかん")
    expect(yours).toHaveTextContent("しゅ-かん")
    // Same number of cells (aligned columns).
    expect(correct.querySelectorAll(".reading-answer-diff-cell")).toHaveLength(5)
    expect(yours.querySelectorAll(".reading-answer-diff-cell")).toHaveLength(5)
    // The missing character is highlighted on the correct line.
    expect(
      correct.querySelectorAll(".reading-answer-diff-cell")[2],
    ).toHaveClass("reading-answer-diff-missing")
  })

  it("shows furigana on the correct answer when it has kanji (correct case)", () => {
    const { container } = render(
      <AnswerComparison typed="猫" expected="猫" reading="ねこ" />,
    )
    expect(container.querySelector("ruby")?.textContent).toBe("猫ねこ")
    expect(container.querySelector("rt")?.textContent).toBe("ねこ")
  })

  it("shows furigana on the correct line even when the answer is wrong", () => {
    const { container } = render(
      <AnswerComparison typed="犬" expected="猫" reading="ねこ" />,
    )
    expect(screen.getByText("あなたの答え")).toBeInTheDocument()
    expect(container.querySelector("rt")?.textContent).toBe("ねこ")
  })

  it("adds no furigana for a kana-only answer", () => {
    const { container } = render(
      <AnswerComparison typed="いぬ" expected="ねこ" reading="" />,
    )
    expect(container.querySelector("ruby")).toBeNull()
  })

  it("splits furigana per kanji cluster when a readings map fully covers the answer (correct case)", () => {
    const { container } = render(
      <AnswerComparison
        typed="緩やかな風"
        expected="緩やかな風"
        reading="ゆるやかなかぜ"
        readings={{ 緩: "ゆる", 風: "かぜ" }}
      />,
    )
    const rubies = container.querySelectorAll("ruby")
    expect(rubies).toHaveLength(2)
    expect(rubies[0]?.textContent).toBe("緩ゆる")
    expect(rubies[1]?.textContent).toBe("風かぜ")
  })

  it("splits furigana per kanji cluster when a readings map fully covers the answer (wrong case)", () => {
    const { container } = render(
      <AnswerComparison
        typed="緩やかな空"
        expected="緩やかな風"
        reading="ゆるやかなかぜ"
        readings={{ 緩: "ゆる", 風: "かぜ" }}
      />,
    )
    const correct = container.querySelector(
      '[data-reading-diff-line="correct"]',
    )!
    const rubies = correct.querySelectorAll(".reading-answer-diff-furigana")
    expect(rubies).toHaveLength(2)
    expect(rubies[0]?.querySelector("rt")?.textContent).toBe("ゆる")
    expect(rubies[1]?.querySelector("rt")?.textContent).toBe("かぜ")
  })

  it("falls back to a single flat reading when the map doesn't fully cover the answer", () => {
    const { container } = render(
      <AnswerComparison
        typed="緩やかな風"
        expected="緩やかな風"
        reading="ゆるやかなかぜ"
        readings={{ 緩: "ゆる" }}
      />,
    )
    const rubies = container.querySelectorAll("ruby")
    expect(rubies).toHaveLength(1)
    expect(rubies[0]?.textContent).toBe("緩やかな風ゆるやかなかぜ")
  })
})
