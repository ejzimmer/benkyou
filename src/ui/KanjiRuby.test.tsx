import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { RubyWord } from "./KanjiRuby"

describe("RubyWord", () => {
  it("annotates kanji with the reading", () => {
    const { container } = render(<RubyWord surface="頻繁" reading="ひんぱん" />)
    expect(container.querySelector("rt")).toHaveTextContent("ひんぱん")
  })

  it("annotates a kanji from outside the Basic Multilingual Plane", () => {
    // 𠮟 is a surrogate pair, so a /[一-鿿]/ test reads it as two
    // stray halves and drops the reading it was given.
    const { container } = render(<RubyWord surface="𠮟責" reading="しっせき" />)
    expect(container.querySelector("rt")).toHaveTextContent("しっせき")
  })

  it("shows plain text when there is no reading to annotate with", () => {
    const { container } = render(<RubyWord surface="頻繁" />)
    expect(container.querySelector("ruby")).toBeNull()
    expect(screen.getByText("頻繁")).toBeInTheDocument()
  })

  it("shows plain text for kana, which needs no furigana", () => {
    const { container } = render(<RubyWord surface="ひんぱん" reading="ひんぱん" />)
    expect(container.querySelector("ruby")).toBeNull()
  })
})
