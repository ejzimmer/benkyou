/** NFKC + trim + collapse whitespace for loose matching */
export function normalizeJapanese(s: string): string {
  return s.normalize("NFKC").trim().replace(/\s+/g, " ")
}

export function hasKanjiOrKatakana(s: string): boolean {
  for (const ch of s) {
    const cp = ch.codePointAt(0)!
    if (cp >= 0x4e00 && cp <= 0x9fff) return true
    if (cp >= 0x30a0 && cp <= 0x30ff) return true
  }
  return false
}

/** Reading-type answers should be hiragana only (plan: warn on kanji/katakana). */
export function hasNonHiraganaKana(s: string): boolean {
  for (const ch of s) {
    const cp = ch.codePointAt(0)!
    if (cp >= 0x3040 && cp <= 0x309f) continue
    if (cp === 0x3000 || cp === 0x30fb) continue
    if (/\s/.test(ch)) continue
    return true
  }
  return false
}
