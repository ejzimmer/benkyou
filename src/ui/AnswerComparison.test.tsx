import { describe, expect, it } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { AnswerComparison, rowRanges } from "./AnswerComparison"

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

  it("annotates from the readings map alone when there is no whole-word reading", () => {
    const { container } = render(
      <AnswerComparison
        typed="特殊な製法"
        expected="特殊な製法"
        readings={{ 特殊: "とくしゅ", 製法: "せいほう" }}
      />,
    )
    const rubies = container.querySelectorAll("ruby")
    expect(rubies).toHaveLength(2)
    expect(rubies[0]?.textContent).toBe("特殊とくしゅ")
    expect(rubies[1]?.textContent).toBe("製法せいほう")
  })

  it("announces the flattened readings-map reading to screen readers when wrong", () => {
    const { container } = render(
      <AnswerComparison
        typed="特殊な方法"
        expected="特殊な製法"
        readings={{ 特殊: "とくしゅ", 製法: "せいほう" }}
      />,
    )
    const correct = container.querySelector(
      '[data-reading-diff-line="correct"]',
    )!
    expect(
      correct.querySelectorAll(".reading-answer-diff-furigana"),
    ).toHaveLength(2)
    expect(correct.querySelector(".sr-only")?.textContent).toBe(
      "とくしゅなせいほう",
    )
  })

  it("adds no furigana when neither a reading nor a covering map is given", () => {
    const { container } = render(
      <AnswerComparison typed="方法" expected="製法" readings={{ 特殊: "とくしゅ" }} />,
    )
    expect(container.querySelector("rt")).toBeNull()
  })

  it("annotates the clusters the map covers when there's no whole-word reading", () => {
    const { container } = render(
      <AnswerComparison
        typed="特殊な製法"
        expected="特殊な製法"
        readings={{ 特殊: "とくしゅ" }}
      />,
    )
    const rubies = container.querySelectorAll("ruby")
    expect(rubies).toHaveLength(1)
    expect(rubies[0]?.textContent).toBe("特殊とくしゅ")
    expect(container.textContent).toContain("製法")
  })

  it("keeps the whole-word reading when the map covers only part of the answer", () => {
    // 人=ひと (written for an example sentence) must not override 大人=おとな.
    const { container } = render(
      <AnswerComparison typed="大人" expected="大人" reading="おとな" readings={{ 人: "ひと" }} />,
    )
    const rubies = container.querySelectorAll("ruby")
    expect(rubies).toHaveLength(1)
    expect(rubies[0]?.textContent).toBe("大人おとな")
  })

  it("falls back to the whole-word reading when the map annotates nothing", () => {
    const { container } = render(
      <AnswerComparison
        typed="緩やかな風"
        expected="緩やかな風"
        reading="ゆるやかなかぜ"
        readings={{ 結論: "けつろん" }}
      />,
    )
    const rubies = container.querySelectorAll("ruby")
    expect(rubies).toHaveLength(1)
    expect(rubies[0]?.textContent).toBe("緩やかな風ゆるやかなかぜ")
  })

  it("describes the answer to screen readers only when a whole-word reading exists", () => {
    const covered = render(
      <AnswerComparison
        typed="特殊な方法"
        expected="特殊な製法"
        readings={{ 特殊: "とくしゅ", 製法: "せいほう" }}
      />,
    )
    const coveredLine = covered.container.querySelector(
      '[data-reading-diff-line="correct"]',
    )!
    expect(coveredLine).toHaveAttribute("aria-describedby")

    const partial = render(
      <AnswerComparison
        typed="特殊な方法"
        expected="特殊な製法"
        readings={{ 特殊: "とくしゅ" }}
      />,
    )
    const partialLine = partial.container.querySelector(
      '[data-reading-diff-line="correct"]',
    )!
    // No reading for the answer as a whole — announcing "とくしゅな製法" as
    // one would read raw kanji out as the pronunciation.
    expect(partialLine).not.toHaveAttribute("aria-describedby")
    expect(
      partialLine.querySelectorAll(".reading-answer-diff-furigana"),
    ).toHaveLength(1)
  })
})

describe("rowRanges", () => {
  it("keeps a diff that fits on one row", () => {
    expect(rowRanges(5, 10, [])).toEqual([[0, 5]])
  })

  it("splits a long diff into rows of at most perRow columns", () => {
    expect(rowRanges(20, 8, [])).toEqual([
      [0, 8],
      [8, 16],
      [16, 20],
    ])
  })

  it("moves a furigana group that would straddle a row break onto the next row", () => {
    expect(rowRanges(10, 5, [{ start: 3, end: 6, text: "x" }])).toEqual([
      [0, 3],
      [3, 8],
      [8, 10],
    ])
  })

  it("still splits a group wider than a whole row", () => {
    expect(rowRanges(10, 4, [{ start: 0, end: 9, text: "x" }])).toEqual([
      [0, 4],
      [4, 8],
      [8, 10],
    ])
  })
})

