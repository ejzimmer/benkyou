import { toHiragana } from "wanakana"

/** NFKC + trim + collapse whitespace for loose matching */
export function normalizeJapanese(s: string): string {
  return s.normalize("NFKC").trim().replace(/\s+/g, " ")
}

/**
 * Finalize a reading answer typed through the wanakana IME converter.
 *
 * In IME mode wanakana leaves a trailing romaji "n" un-converted while it waits
 * to see whether the next keystroke forms な/に/etc. So committing with Enter
 * right after typing "...n" can leave a dangling Latin "n" — or the full-width
 * "ｎ" some IMEs emit — instead of ん (e.g. "もちろn"/"もちろｎ" rather than
 * "もちろん"). NFKC folds full-width Latin to ASCII, a full (non-IME) toHiragana
 * pass converts the dangling "n" along with any other leftover romaji, and a
 * final guard maps any still-trailing "n"/"N" to ん — including right before a
 * comma/、, since a multi-segment reading answer joins segments with one and a
 * dangling "n" can be left at the end of an earlier segment, not just the last.
 */
export function finalizeReadingAnswer(s: string): string {
  return toHiragana(s.normalize("NFKC"))
    .replace(/[nN](?=[,、])/g, "ん")
    .replace(/[nN]$/, "ん")
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
