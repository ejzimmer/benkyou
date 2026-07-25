/** Separator between per-gap answers in a construction: ASCII "," or Japanese "、". */
const ANSWER_SEPARATOR = /[、,]/

/** A run of halfwidth "_" or fullwidth "＿" — the fill-in-the-gap marker. */
const GAP_MARKER_PATTERN = /[_＿]+/

/**
 * The gap marker actually used in a sentence: a run of underscores (any
 * length, halfwidth or fullwidth). Falls back to "___" when the sentence
 * doesn't contain one yet, e.g. for a freshly created card.
 */
export function detectGapMarker(sentenceWithGap: string): string {
  return sentenceWithGap.match(GAP_MARKER_PATTERN)?.[0] ?? "___"
}

/** Number of gap-marker occurrences in a fill-in-the-gap sentence. */
export function countGaps(sentenceWithGap: string, gapMarker: string): number {
  const marker = gapMarker.trim()
  if (!marker || !sentenceWithGap.includes(marker)) return 0
  return sentenceWithGap.split(marker).length - 1
}

/** Split a construction/answer string into its per-gap answers, trimmed. */
export function splitGapAnswers(construction: string): string[] {
  return construction
    .split(ANSWER_SEPARATOR)
    .map((part) => part.trim())
    .filter(Boolean)
}

/** Canonical separator used to join per-gap answers back into one string. */
export const GAP_ANSWER_JOIN = ", "

/** Canonical comma-joined form of a (possibly 、-separated) answer string. */
export function normalizeGapAnswers(construction: string): string {
  return splitGapAnswers(construction).join(GAP_ANSWER_JOIN)
}

/**
 * Split a typed answer into exactly `gapCount` positional slots, padding with
 * empty strings. Used to give each gap its own input while the card is being
 * answered, without losing which slot the user has started typing into.
 */
export function typedGapValues(typed: string, gapCount: number): string[] {
  const parts = typed
    .split(ANSWER_SEPARATOR)
    .map((part) => part.replace(/^\s+/, ""))
  while (parts.length < gapCount) parts.push("")
  return parts.slice(0, gapCount)
}
