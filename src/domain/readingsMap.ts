import { containsKanji } from "./vocabularyContent"

export type ReadingSegment = { text: string; reading?: string }

/**
 * Split `text` against a phrase→reading map using greedy longest-match — the
 * same tokenization `RubySegment` renders as furigana. Unmatched characters
 * come back as their own segment with no reading.
 */
export function segmentText(
  text: string,
  readings: Record<string, string>,
): ReadingSegment[] {
  const keys = Object.keys(readings)
    .filter((k) => k.trim() && readings[k]?.trim())
    .sort((a, b) => b.length - a.length)
  const segments: ReadingSegment[] = []
  let i = 0
  while (i < text.length) {
    const key = keys.find((k) => text.slice(i, i + k.length) === k)
    if (key) {
      segments.push({ text: key, reading: readings[key] })
      i += key.length
    } else {
      segments.push({ text: text[i]! })
      i += 1
    }
  }
  return segments
}

/**
 * `segmentText`, but only returned when every kanji character in `text` ends
 * up inside a matched (read) segment — otherwise the caller should fall back
 * to a single whole-string reading (or none), since a partial breakdown
 * would silently drop part of the pronunciation.
 */
export function fullyCoveredSegments(
  text: string,
  readings: Record<string, string>,
): ReadingSegment[] | undefined {
  const segments = segmentText(text, readings)
  const hasUncoveredKanji = segments.some(
    (s) => !s.reading?.trim() && containsKanji(s.text),
  )
  return hasUncoveredKanji ? undefined : segments
}

export type LabeledReading = { label: string; reading: string }

/**
 * Strip a label's trailing non-kanji suffix (okurigana) from both the label
 * and its reading — e.g. 至る/いたる → 至/いた — since furigana
 * conventionally annotates only the kanji, leaving okurigana as plain text.
 * Returns the pair unchanged when the label has no kanji, or no such
 * suffix (e.g. 結論/けつろん, a pure kanji run).
 */
export function kanjiOnlyEntry(label: string, reading: string): LabeledReading {
  let end = label.length
  while (end > 0 && !containsKanji(label[end - 1]!)) end--
  if (end === 0 || end === label.length) return { label, reading }
  const suffixLen = label.length - end
  // A `reading` shorter than the suffix (e.g. still mid-typed) can't be
  // stripped meaningfully — `slice`'s negative-end wraparound would return a
  // garbled partial string rather than an empty one, so bail out unstripped.
  if (suffixLen >= reading.length) return { label: label.slice(0, end), reading }
  return { label: label.slice(0, end), reading: reading.slice(0, reading.length - suffixLen) }
}

/** Derive a kanji-only furigana map from a list of tested word/reading pairs. */
export function deriveFurigana(
  parts: LabeledReading[],
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const { label, reading } of parts) {
    if (!label.trim() || !reading.trim()) continue
    const entry = kanjiOnlyEntry(label, reading)
    result[entry.label] = entry.reading
  }
  return result
}

/**
 * Re-seed a furigana map with freshly-derived auto-seed entries, without
 * touching entries the author has manually changed since the last seed —
 * or entries that were never part of any seed at all, e.g. furigana added
 * by hand for an unrelated word in an example sentence.
 */
export function reseedFurigana(
  current: Record<string, string>,
  previousSeed: Record<string, string>,
  nextSeed: Record<string, string>,
): Record<string, string> {
  const next = { ...current }
  // A key whose current value no longer matches what was last seeded there
  // has been diverged by the author — whether edited to a new value, or
  // deleted outright (current[key] is then undefined, which also doesn't
  // match). Either way, never auto-manage that key again, even if a later
  // seed would produce the exact same key.
  const diverged = new Set<string>()
  for (const [key, value] of Object.entries(previousSeed)) {
    if (next[key] === value) {
      delete next[key]
    } else {
      diverged.add(key)
    }
  }
  for (const [key, value] of Object.entries(nextSeed)) {
    if (!(key in next) && !diverged.has(key)) next[key] = value
  }
  return next
}

/** Separator between a phrase key and its reading: ASCII "=" or fullwidth "＝". */
const KEY_VALUE_SEPARATOR = /[=＝]/

/** Serialize a phrase→reading map for a card editor (one `key=value` per line). */
export function readingsMapToText(readings: Record<string, string>): string {
  return Object.entries(readings)
    .filter(([k]) => k.trim().length > 0)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n")
}

/** Parse completed `phrase=reading` (or `phrase＝reading`) lines; lines without a separator are ignored (draft lines live only in textarea state). */
export function parseReadingsMapText(text: string): Record<string, string> {
  const readings: Record<string, string> = {}
  for (const line of text.split("\n")) {
    const match = KEY_VALUE_SEPARATOR.exec(line)
    if (!match) continue
    const k = line.slice(0, match.index).trim()
    if (!k) continue
    readings[k] = line.slice(match.index + 1).trim()
  }
  return readings
}

export type WordReading = {
  reading: string | undefined
  readingParts: Record<string, string>
}

/**
 * Parse the single combined reading field used by the card editor: no
 * `=`/`＝` anywhere means the whole text is one whole-word reading;
 * otherwise it's `phrase=reading` lines, one per tested cluster.
 */
export function parseWordReadingText(text: string): WordReading {
  if (!KEY_VALUE_SEPARATOR.test(text)) {
    // A stray newline (e.g. an accidental Enter in what's now a textarea,
    // where the old whole-word reading field was a single-line input) must
    // not end up embedded in the reading — that would make it unmatchable
    // against any real typed answer.
    const reading = text.replace(/\n/g, "").trim()
    return { reading: reading || undefined, readingParts: {} }
  }
  return { reading: undefined, readingParts: parseReadingsMapText(text) }
}

/**
 * Inverse of `parseWordReadingText`, for hydrating the combined field from
 * saved content. `reading` and `readingParts` are normally mutually
 * exclusive, but a card merge (`mergeCardContent`) can leave both set at
 * once — when that happens, fold `reading` in as its own `label=reading`
 * entry rather than silently hiding it (and losing it on the next edit).
 */
export function wordReadingToText(
  reading: string | undefined,
  readingParts: Record<string, string> | undefined,
  label: string,
): string {
  const parts = readingParts ?? {}
  const hasParts = Object.keys(parts).length > 0
  if (reading?.trim()) {
    return hasParts ? readingsMapToText({ ...parts, [label]: reading }) : reading
  }
  return readingsMapToText(parts)
}

export type GrammarReadings = {
  /** The construction's own tested reading — not shown as furigana. */
  reading: string | undefined
  /** Kanji phrases → readings shown as furigana in the sentence. */
  readings: Record<string, string>
}

/**
 * Parse a grammar card's combined "Readings" field: `phrase=reading` (or
 * `phrase＝reading`) lines are furigana shown over the sentence; a line with
 * no separator is the construction's own tested reading, kept separate from
 * furigana since it may deliberately differ from the construction's literal
 * text (e.g. testing a conjugated form's dictionary-form reading).
 */
export function parseGrammarReadingsText(text: string): GrammarReadings {
  const furiganaLines: string[] = []
  const readingLines: string[] = []
  for (const line of text.split("\n")) {
    if (KEY_VALUE_SEPARATOR.test(line)) {
      furiganaLines.push(line)
    } else if (line.trim()) {
      readingLines.push(line.trim())
    }
  }
  return {
    reading: readingLines.join("") || undefined,
    readings: parseReadingsMapText(furiganaLines.join("\n")),
  }
}

/**
 * Inverse of `parseGrammarReadingsText`, for hydrating the combined field
 * from saved content. Folds any `constructionReadingParts` the card still
 * carries (e.g. from before the two fields were combined, or from an Anki
 * import) in as furigana lines too, so that data isn't silently dropped now
 * that this field is the only place either kind of reading is authored.
 */
export function grammarReadingsToText(content: {
  constructionReading?: string
  constructionReadingParts?: Record<string, string>
  readings: Record<string, string>
}): string {
  const readings = { ...content.readings }
  for (const [label, reading] of Object.entries(
    content.constructionReadingParts ?? {},
  )) {
    if (label.trim() && reading.trim() && !(label in readings)) {
      readings[label] = reading
    }
  }
  const lines: string[] = []
  if (content.constructionReading?.trim()) {
    lines.push(content.constructionReading.trim())
  }
  const furiganaText = readingsMapToText(readings)
  if (furiganaText) lines.push(furiganaText)
  return lines.join("\n")
}

/**
 * Add `word => reading` to a phrase map as a fallback, without overwriting
 * an explicit entry the map already has for that word.
 */
export function withWordReadingFallback(
  readings: Record<string, string>,
  word: string,
  reading: string | undefined,
): Record<string, string> {
  if (reading?.trim() && !readings[word]) {
    return { ...readings, [word]: reading }
  }
  return { ...readings }
}
