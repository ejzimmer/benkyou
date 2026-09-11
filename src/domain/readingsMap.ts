import { containsKanji, extractKanji } from "./vocabularyContent"

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
 * `segmentText`, but only returned when the map actually annotates something
 * in `text` — every entry that matches is shown as furigana, and kanji the
 * author hasn't given a reading for simply stay bare (the same way
 * `RubySegment` already renders example sentences). Undefined means the map
 * says nothing about this text, so the caller should fall back to a
 * whole-string reading if it has one.
 */
export function annotatedSegments(
  text: string,
  readings: Record<string, string>,
): ReadingSegment[] | undefined {
  const segments = segmentText(text, readings)
  return segments.some((s) => s.reading?.trim()) ? segments : undefined
}

/**
 * Flatten segments into a single reading string for the whole text — each
 * segment's reading, with any unannotated characters between them (e.g. the
 * な in 特殊な製法) kept as-is. Returns undefined unless the segments account
 * for every kanji: with an unread kanji left in, the result would be a
 * mixture of reading and surface text, not a reading (and passing that off as
 * one would have a screen reader announce raw kanji as the pronunciation).
 */
export function joinSegmentReadings(
  segments: ReadingSegment[] | undefined,
): string | undefined {
  if (!segments?.some((s) => s.reading?.trim())) return undefined
  if (segments.some((s) => !s.reading?.trim() && containsKanji(s.text))) {
    return undefined
  }
  return segments.map((s) => s.reading?.trim() || s.text).join("")
}

/**
 * How to annotate `text`, given a card's furigana map and its whole-word
 * `reading`: the author's own per-cluster breakdown when it accounts for
 * every kanji; otherwise the whole-word reading, when there is one, since a
 * partial map must not override a complete reading — an entry the author
 * wrote for an example sentence (人=ひと) would otherwise hijack a word it
 * happens to appear in (大人 = おとな) and show a reading that's wrong there.
 * Failing both, whatever the map does annotate, so furigana the author wrote
 * is never simply dropped.
 *
 * Undefined means the caller should fall back to a single whole-word ruby
 * from `reading` (or show none, when there isn't one).
 */
export function furiganaSegments(
  text: string,
  readings: Record<string, string> | undefined,
  reading: string | undefined,
): ReadingSegment[] | undefined {
  const segments = readings ? annotatedSegments(text, readings) : undefined
  if (!segments) return undefined
  if (joinSegmentReadings(segments)) return segments
  return reading?.trim() ? undefined : segments
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

/**
 * Append a blank `kanji=` line to a furigana textarea's draft text for every
 * kanji character found in `sourceTexts` (e.g. a card's term and example
 * sentences) that isn't already covered by an existing key — either an exact
 * match or as part of a longer phrase already entered (e.g. 結論 already
 * covers 結 and 論). Leaves the reading side of each new line blank for the
 * author to fill in.
 */
export function addMissingKanjiLines(
  furiganaText: string,
  sourceTexts: string[],
): string {
  const existingKeys = furiganaText
    .split("\n")
    .map((line) => {
      const match = KEY_VALUE_SEPARATOR.exec(line)
      return match ? line.slice(0, match.index).trim() : ""
    })
    .filter((key) => key.length > 0)

  const missing = extractKanji(sourceTexts).filter(
    (kanji) => !existingKeys.some((key) => key.includes(kanji)),
  )
  if (missing.length === 0) return furiganaText

  const newLines = missing.map((kanji) => `${kanji}=`).join("\n")
  return furiganaText.trim() ? `${furiganaText}\n${newLines}` : newLines
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
