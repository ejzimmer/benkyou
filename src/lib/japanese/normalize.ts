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

/**
 * True if the answer contains any Latin-script letter (plain ASCII or
 * accented). Typing English/romaji into a "type the Japanese word/
 * construction" field is a validation error, not a wrong-answer mistake —
 * it should block the reveal rather than get graded.
 */
export function hasLatinScript(s: string): boolean {
  return /\p{Script=Latin}/u.test(s)
}

/**
 * ん immediately before a vowel or や/ゆ/よ mora is romaji-ambiguous with the
 * following mora's な行/にゃ row: a single "n" there reads as な/に/ぬ/ね/の
 * (or にゃ/にゅ/にょ before や/ゆ/よ), so proper romaji needs a doubled "nn"
 * to force ん instead. Missing that doubling is the classic IME slip this
 * maps: the mora ん would have merged into if the second "n" was dropped.
 */
const N_MERGE_TARGETS: Record<string, string> = {
  あ: "な",
  い: "に",
  う: "ぬ",
  え: "ね",
  お: "の",
  や: "にゃ",
  ゆ: "にゅ",
  よ: "にょ",
}

/** Indices of ん in `s` that would be swallowed into the next mora unless a
 * doubled "nn" is typed before it. */
function mergeableNIndices(s: string): number[] {
  const indices: number[] = []
  for (let i = 0; i < s.length - 1; i++) {
    if (s[i] === "ん" && N_MERGE_TARGETS[s[i + 1]]) indices.push(i)
  }
  return indices
}

/** Merge ん + vowel/や行 into the swallowed mora at the given indices (into
 * `s`), left of any index that hasn't been merged staying valid throughout
 * since merges are applied right-to-left. */
function mergeNAt(s: string, indices: number[]): string {
  let result = s
  for (const i of [...indices].sort((a, b) => b - a)) {
    result = result.slice(0, i) + N_MERGE_TARGETS[result[i + 1]] + result.slice(i + 2)
  }
  return result
}

/**
 * True when `typed` is wrong only because one or more ん-before-vowel/や行
 * morae got swallowed into the following な行/にゃ-row mora — the missed-
 * doubled-"n" IME slip (e.g. うんえいしゃ typed as "u,n,e,i,sha" instead of
 * "u,nn,e,i,sha" comes out うねいしゃ, not うんえいしゃ). Every other
 * character of `typed` must match `expected` exactly: this targets that one
 * specific slip rather than fuzzy-matching wrong answers in general.
 */
export function isMissingDoubledN(typed: string, expected: string): boolean {
  if (!typed || typed === expected) return false
  const indices = mergeableNIndices(expected)
  if (indices.length === 0) return false
  for (let mask = 1; mask < 1 << indices.length; mask++) {
    const subset = indices.filter((_, bit) => mask & (1 << bit))
    if (mergeNAt(expected, subset) === typed) return true
  }
  return false
}
