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

export type CombinedReading = {
  /** The word/construction's own tested reading — not shown as furigana. */
  reading: string | undefined
  /** Kanji phrases → readings shown as furigana. */
  readings: Record<string, string>
}

/**
 * Parse a card's combined "Readings" field (shared by vocab words and
 * grammar constructions): `phrase=reading` (or `phrase＝reading`) lines are
 * furigana shown over the word/sentence; a line with no separator is the
 * word/construction's own tested reading, kept separate from furigana since
 * it may deliberately differ from the literal text (e.g. testing a
 * conjugated form's dictionary-form reading).
 */
export function parseCombinedReadingsText(text: string): CombinedReading {
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
 * Inverse of `parseCombinedReadingsText`, for hydrating the combined field
 * from saved content. Folds any legacy per-cluster `readingParts` the card
 * still carries (e.g. from before the reading/furigana fields were
 * combined, or from an Anki import) in as furigana lines too, so that data
 * isn't silently dropped now that this field is the only place either kind
 * of reading is authored.
 */
export function combinedReadingsToText(content: {
  reading?: string
  readingParts?: Record<string, string>
  readings: Record<string, string>
}): string {
  const readings = { ...content.readings }
  for (const [label, reading] of Object.entries(content.readingParts ?? {})) {
    if (label.trim() && reading.trim() && !(label in readings)) {
      readings[label] = reading
    }
  }
  const lines: string[] = []
  if (content.reading?.trim()) {
    lines.push(content.reading.trim())
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
