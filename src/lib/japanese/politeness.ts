/**
 * Plain (普通形) ↔ polite (丁寧形) counterparts of a Japanese answer, so a
 * card stored as 食べる also accepts 食べます (and vice versa) without the
 * author listing both. Rule-based, with no dictionary: verb class is guessed
 * from the spelling (see `isIchidanRu`), and when that's genuinely ambiguous
 * — a polite stem like 起き could be 起きる or 起く — every plausible
 * counterpart is returned. The extras are only ever compared against what
 * the learner typed, so a non-word among them just never matches.
 */

const U_TO_I: Record<string, string> = {
  う: "い", く: "き", ぐ: "ぎ", す: "し", つ: "ち",
  ぬ: "に", ぶ: "び", む: "み", る: "り",
}
const I_TO_U = invert(U_TO_I)
const I_TO_A: Record<string, string> = {
  い: "わ", き: "か", ぎ: "が", し: "さ", ち: "た",
  に: "な", び: "ば", み: "ま", り: "ら",
}
const A_TO_I = invert(I_TO_A)
const I_TO_O: Record<string, string> = {
  い: "お", き: "こ", ぎ: "ご", し: "そ", ち: "と",
  に: "の", び: "ぼ", み: "も", り: "ろ",
}
const O_TO_I = invert(I_TO_O)
/** Godan past/て-form endings → the masu-stem kana they come from. */
const PAST_TO_I: [string, string[]][] = [
  ["いた", ["き"]],
  ["いだ", ["ぎ"]],
  ["した", ["し"]],
  ["った", ["い", "ち", "り"]],
  ["んだ", ["に", "び", "み"]],
]
const I_TO_PAST: Record<string, string> = {
  き: "いた", ぎ: "いだ", し: "した", い: "った", ち: "った",
  り: "った", に: "んだ", び: "んだ", み: "んだ",
}

const I_ROW = "いきぎしじちぢにひびぴみり"
const E_ROW = "えけげせぜてでねへべぺめれ"

/** Kanji that make an ichidan verb on their own before る (見る, 寝る). Any
 * other kanji directly before る is godan (取る, 帰る, 切る). */
const ICHIDAN_KANJI_RU = new Set("見着似煮居寝出得経干射鋳診")
/** Godan verbs whose okurigana looks ichidan (an i/e-row kana before る). */
const GODAN_OKURIGANA_RU = ["混じる", "交じる", "甦る", "蘇る"]
/** Whole kana words that are godan despite an i/e-row kana before る. */
const GODAN_KANA_RU = new Set([
  "はいる", "はしる", "しる", "へる", "しゃべる", "すべる", "あせる",
  "にぎる", "まいる", "まじる", "ちる", "しげる", "さえぎる", "くつがえる",
  "おちいる", "ののしる", "あざける", "ひねる", "いじる", "かぎる",
  "よみがえる", "ひるがえる", "ける", "てる",
])
/** Whole kana words that are both (帰る/変える, 切る/着る, 練る/寝る, …). */
const AMBIGUOUS_KANA_RU = new Set(["かえる", "きる", "ねる", "しめる"])

function invert(map: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k]))
}

function isKanji(ch: string | undefined): boolean {
  return Boolean(ch) && /\p{Script=Han}/u.test(ch!)
}

function isIchidanStemEnd(ch: string | undefined): boolean {
  return Boolean(ch) && (I_ROW.includes(ch!) || E_ROW.includes(ch!) || isKanji(ch))
}

/** Verb classes a dictionary-form verb ending in る could belong to. */
function ruVerbClasses(word: string): ("ichidan" | "godan")[] {
  if (GODAN_OKURIGANA_RU.some((v) => word.endsWith(v))) return ["godan"]
  if (GODAN_KANA_RU.has(word)) return ["godan"]
  if (AMBIGUOUS_KANA_RU.has(word)) return ["ichidan", "godan"]
  const before = [...word].at(-2)
  if (isKanji(before)) return ICHIDAN_KANJI_RU.has(before!) ? ["ichidan"] : ["godan"]
  if (before && (I_ROW.includes(before) || E_ROW.includes(before))) return ["ichidan"]
  return ["godan"]
}

/** True when `word` ends in a standalone 来る/くる (not e.g. つくる). */
function endsWithKuru(word: string, kanaKuru: string): boolean {
  if (!word.endsWith(kanaKuru)) return false
  const before = word.slice(0, -kanaKuru.length).at(-1)
  return before === undefined || before === "て" || before === "で"
}

/** Masu-stems (食べ, 書き, し) a dictionary-form verb conjugates from. */
function masuStems(verb: string): string[] {
  if (verb.endsWith("する")) return [verb.slice(0, -2) + "し"]
  if (verb.endsWith("来る")) return [verb.slice(0, -1)]
  if (endsWithKuru(verb, "くる")) return [verb.slice(0, -2) + "き"]
  const last = verb.at(-1)!
  const base = verb.slice(0, -1)
  if (last === "る") {
    return ruVerbClasses(verb).map((c) => (c === "ichidan" ? base : base + "り"))
  }
  return U_TO_I[last] ? [base + U_TO_I[last]] : []
}

/** Masu-stem from a ない/なかった stem (書か → 書き, 食べ → 食べ, こ → き). */
function masuStemsFromNai(naiStem: string): string[] {
  const last = naiStem.at(-1)
  if (!last) return []
  if (naiStem === "こ" || (last === "こ" && endsWithKuru(naiStem + "る", "こる")))
    return [naiStem.slice(0, -1) + "き"]
  if (A_TO_I[last]) return [naiStem.slice(0, -1) + A_TO_I[last]]
  if (isIchidanStemEnd(last)) return [naiStem]
  return []
}

/** ない-stems a masu-stem could negate from (書き → 書か / 書き). */
function naiStemsFromMasu(stem: string): string[] {
  const last = stem.at(-1)
  if (!last) return []
  const out: string[] = []
  if (isIchidanStemEnd(last)) out.push(stem)
  if (I_TO_A[last]) out.push(stem.slice(0, -1) + I_TO_A[last])
  if (stem === "き" || stem.endsWith("てき") || stem.endsWith("でき"))
    out.push(stem.slice(0, -1) + "こ")
  return out
}

function plainToPolite(w: string): string[] {
  const out: string[] = []
  const strip = (suffix: string) => w.slice(0, -suffix.length)

  // Copula and な-adjective/noun predicates.
  for (const [plain, polite] of [
    ["ではなかった", ["ではありませんでした"]],
    ["じゃなかった", ["じゃありませんでした"]],
    ["ではない", ["ではありません"]],
    ["じゃない", ["じゃありません"]],
    ["だった", ["でした"]],
    ["だろう", ["でしょう"]],
    ["だ", ["です"]],
  ] as const) {
    if (w.endsWith(plain) && w.length > plain.length) {
      out.push(...polite.map((p) => strip(plain) + p))
      break
    }
  }

  // い-adjective (and ない/たい) forms take です; their negatives also have
  // an ありません form.
  if (w.endsWith("くなかった")) out.push(strip("なかった") + "ありませんでした")
  else if (w.endsWith("くない")) out.push(strip("ない") + "ありません")
  if (w === "ない") out.push("ありません")
  if (w === "なかった") out.push("ありませんでした")
  if (w.endsWith("い") || w.endsWith("かった")) out.push(w + "です")

  // Verbs.
  if (w.endsWith("なかった")) {
    for (const s of masuStemsFromNai(strip("なかった"))) out.push(s + "ませんでした")
  } else if (w.endsWith("ない")) {
    for (const s of masuStemsFromNai(strip("ない"))) out.push(s + "ません")
  } else if (w.endsWith("よう")) {
    const stem = strip("よう")
    if (stem === "こ" || endsWithKuru(stem + "る", "こる"))
      out.push(stem.slice(0, -1) + "きましょう")
    else if (isIchidanStemEnd(stem.at(-1))) out.push(stem + "ましょう")
  } else if (w.endsWith("う") && O_TO_I[w.at(-2) ?? ""]) {
    out.push(w.slice(0, -2) + O_TO_I[w.at(-2)!] + "ましょう")
  }

  if (w.endsWith("た") || w.endsWith("だ")) {
    if (w.endsWith("行った")) out.push(strip("った") + "きました")
    for (const [ending, stems] of PAST_TO_I) {
      if (w.endsWith(ending))
        for (const s of stems) out.push(strip(ending) + s + "ました")
    }
    if (w.endsWith("た") && isIchidanStemEnd(strip("た").at(-1)))
      out.push(strip("た") + "ました")
  }

  if (U_TO_I[w.at(-1) ?? ""]) {
    for (const s of masuStems(w)) out.push(s + "ます")
  }

  return out
}

function politeToPlain(w: string): string[] {
  const out: string[] = []
  const strip = (suffix: string) => w.slice(0, -suffix.length)

  for (const [polite, plain] of [
    ["ではありませんでした", ["ではなかった"]],
    ["じゃありませんでした", ["じゃなかった"]],
    ["くありませんでした", ["くなかった"]],
    ["ではありません", ["ではない"]],
    ["じゃありません", ["じゃない"]],
    ["くありません", ["くない"]],
  ] as const) {
    if (w.endsWith(polite)) {
      out.push(...plain.map((p) => strip(polite) + p))
      return out
    }
  }
  if (w === "ありませんでした") return ["なかった"]
  if (w === "ありません") return ["ない"]

  if (w.endsWith("ませんでした")) {
    // Verb negative past, handled below.
  } else if (w.endsWith("でした")) out.push(strip("でした") + "だった")
  else if (w.endsWith("でしょう")) out.push(strip("でしょう") + "だろう")
  else if (w.endsWith("です") && w.length > 2) {
    const base = strip("です")
    // い-adjectives, ない/たい and past かった drop です; anything else is a
    // noun/な-adjective predicate, plain with だ.
    if (base.endsWith("い") || base.endsWith("かった")) out.push(base)
    else out.push(base + "だ")
  }

  if (w.endsWith("ませんでした")) {
    for (const s of naiStemsFromMasu(strip("ませんでした"))) out.push(s + "なかった")
  } else if (w.endsWith("ません")) {
    for (const s of naiStemsFromMasu(strip("ません"))) out.push(s + "ない")
  } else if (w.endsWith("ました")) {
    const stem = strip("ました")
    const last = stem.at(-1)
    if (stem.endsWith("行き")) out.push(stem.slice(0, -1) + "った")
    if (isIchidanStemEnd(last)) out.push(stem + "た")
    if (last && I_TO_PAST[last] && last !== "し")
      out.push(stem.slice(0, -1) + I_TO_PAST[last])
  } else if (w.endsWith("ましょう")) {
    const stem = strip("ましょう")
    const last = stem.at(-1)
    if (stem === "き" || stem.endsWith("てき") || stem.endsWith("でき"))
      out.push(stem.slice(0, -1) + "こよう")
    if (isIchidanStemEnd(last)) out.push(stem + "よう")
    if (last && I_TO_O[last] && last !== "し")
      out.push(stem.slice(0, -1) + I_TO_O[last] + "う")
  } else if (w.endsWith("ます")) {
    const stem = strip("ます")
    const last = stem.at(-1)
    if (stem.endsWith("し")) out.push(stem.slice(0, -1) + "する")
    if (stem.endsWith("来")) out.push(stem + "る")
    if (stem === "き" || stem.endsWith("てき") || stem.endsWith("でき"))
      out.push(stem.slice(0, -1) + "くる")
    if (isIchidanStemEnd(last) && last !== "し") out.push(stem + "る")
    if (last && I_TO_U[last] && last !== "し")
      out.push(stem.slice(0, -1) + I_TO_U[last])
  }
  return out
}

/**
 * Plain-form counterparts of a polite answer, or polite counterparts of a
 * plain one (both, de-duplicated, never including `answer` itself). Empty
 * when the answer doesn't end in a recognisable conjugation.
 */
export function politenessCounterparts(answer: string): string[] {
  const w = answer.trim()
  if (!w) return []
  const polite = /(です|でした|でしょう|ます|ません|ませんでした|ました|ましょう)$/.test(w)
  const forms = polite ? politeToPlain(w) : plainToPolite(w)
  return [...new Set(forms)].filter((f) => f && f !== w)
}
