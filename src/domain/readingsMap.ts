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

/** Serialize a phrase→reading map for a card editor (one `key=value` per line). */
export function readingsMapToText(readings: Record<string, string>): string {
  return Object.entries(readings)
    .filter(([k]) => k.trim().length > 0)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n")
}

/** Parse completed `phrase=reading` lines; lines without `=` are ignored (draft lines live only in textarea state). */
export function parseReadingsMapText(text: string): Record<string, string> {
  const readings: Record<string, string> = {}
  for (const line of text.split("\n")) {
    const idx = line.indexOf("=")
    if (idx === -1) continue
    const k = line.slice(0, idx).trim()
    if (!k) continue
    readings[k] = line.slice(idx + 1).trim()
  }
  return readings
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
