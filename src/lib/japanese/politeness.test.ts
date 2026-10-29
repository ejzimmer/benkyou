import { describe, expect, it } from "vitest"
import { politenessCounterparts } from "./politeness"

describe("politenessCounterparts", () => {
  it.each([
    ["食べる", "食べます"],
    ["帰る", "帰ります"],
    ["見る", "見ます"],
    ["書く", "書きます"],
    ["買う", "買います"],
    ["勉強する", "勉強します"],
    ["来る", "来ます"],
    ["持ってくる", "持ってきます"],
    ["つくる", "つくります"],
    ["はいる", "はいります"],
    ["食べている", "食べています"],
    ["食べない", "食べません"],
    ["書かない", "書きません"],
    ["こない", "きません"],
    ["食べた", "食べました"],
    ["書いた", "書きました"],
    ["読んだ", "読みました"],
    ["行った", "行きました"],
    ["話した", "話しました"],
    ["食べなかった", "食べませんでした"],
    ["食べよう", "食べましょう"],
    ["書こう", "書きましょう"],
    ["高い", "高いです"],
    ["高かった", "高かったです"],
    ["高くない", "高くありません"],
    ["高くない", "高くないです"],
    ["食べたい", "食べたいです"],
    ["静かだ", "静かです"],
    ["学生だった", "学生でした"],
    ["学生ではない", "学生ではありません"],
    ["雨だろう", "雨でしょう"],
    ["ない", "ありません"],
  ])("%s ↔ %s", (plain, polite) => {
    expect(politenessCounterparts(plain)).toContain(polite)
    expect(politenessCounterparts(polite)).toContain(plain)
  })

  it("doesn't conjugate a godan る verb as ichidan, or vice versa", () => {
    expect(politenessCounterparts("帰る")).not.toContain("帰ます")
    expect(politenessCounterparts("食べる")).not.toContain("食べります")
    expect(politenessCounterparts("見る")).not.toContain("見ります")
  })

  it("has nothing for an answer that isn't a conjugated predicate", () => {
    expect(politenessCounterparts("猫")).toEqual([])
    expect(politenessCounterparts("ねこ")).toEqual([])
    expect(politenessCounterparts("")).toEqual([])
  })
})
