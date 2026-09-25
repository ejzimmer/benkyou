const KANJI_DIGITS = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"]
const SMALL_UNITS = ["", "十", "百", "千"]
const LARGE_UNITS = ["", "万", "億", "兆", "京"]

/** Kanji for one 4-digit group (0..9999); "" for 0. 一 is dropped before
 * 十/百/千 (十一, 百, 千), matching how the numbers are normally written. */
function groupToKanji(group: string): string {
  let out = ""
  const digits = group.padStart(4, "0")
  for (let i = 0; i < 4; i++) {
    const d = Number(digits[i])
    if (d === 0) continue
    const unit = SMALL_UNITS[3 - i]
    out += (d === 1 && unit ? "" : KANJI_DIGITS[d]) + unit
  }
  return out
}

/** Kanji numeral for a run of ASCII digits, e.g. "11" → 十一, "2024" → 二千二十四,
 * "10000" → 一万. Too large for 京 → left as is. */
function digitsToKanji(digits: string): string {
  const trimmed = digits.replace(/^0+/, "")
  if (!trimmed) return KANJI_DIGITS[0]
  const groups: string[] = []
  for (let end = trimmed.length; end > 0; end -= 4) {
    groups.unshift(trimmed.slice(Math.max(0, end - 4), end))
  }
  if (groups.length > LARGE_UNITS.length) return digits
  return groups
    .map((g, i) => {
      const kanji = groupToKanji(g)
      return kanji && kanji + LARGE_UNITS[groups.length - 1 - i]
    })
    .join("")
}

/**
 * Rewrite every run of Arabic numerals (half- or full-width) as the kanji
 * numeral for the whole number, so 1時 and 一時 compare equal. The run is read
 * as one number: 11 becomes 十一, never 一一.
 */
export function arabicToKanjiNumerals(s: string): string {
  return s.replace(/[0-9０-９]+/g, (run) =>
    digitsToKanji(run.normalize("NFKC")),
  )
}
