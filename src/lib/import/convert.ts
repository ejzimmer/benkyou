import type {
  Card,
  GrammarCardContent,
  ReviewModeId,
  VocabularyCardContent,
} from "../../domain/types"
import { reviewModesForCard } from "../../domain/types"
import type { SchedulingRow } from "../db/schema"
import { serializeFsrs } from "../srs/schedule"
import { createEmptyCard } from "ts-fsrs"
import { ankiSchedulingToFsrs } from "./ankiSrs"
import {
  containsJapanese,
  containsKanji as surfaceHasKanji,
  extractEnglishLines,
  extractMediaRefs,
  hasGapMarker,
  hasReadingSuffix,
  isKanaOnly,
  isWrappedJapanese,
  mimeFromFilename,
  normalizeConstruction,
  normalizeGapMarkers,
  normalizeHeadwordKey,
  readingValue,
  stripHtml,
  stripReadingSuffix,
  unwrapJapanese,
} from "./html"
import type {
  AnkiSchedulingSource,
  BulkImportPayload,
  BulkMediaItem,
  ExtractedAnkiNote,
  ExtractedPackage,
  GrammarCandidate,
  GrammarDecisionMap,
  ModeSchedulingMap,
} from "./types"

type NoteClass =
  | "reading"
  | "basic"
  | "type"
  | "grammar"
  | "reversed"
  | "kana"
  | "other"

type ClassifiedNote = {
  note: ExtractedAnkiNote
  kind: NoteClass
  front: string
  back: string
  frontRaw: string
  backRaw: string
}

function stableCardId(kind: string, parts: Array<string | number>): string {
  return `anki-${kind}-${parts.join("-")}`
}

function stableMediaId(filename: string): string {
  return stableCardId("media", [filename.replace(/[^a-zA-Z0-9._-]+/g, "_")])
}

function defaultDefinitionsEn(definitions: string[]): string[] {
  return definitions.length > 0 ? definitions : []
}

function vocabularyReading(
  wordJa: string,
  overrides: Partial<VocabularyCardContent> | undefined,
  pickReading: (word: string) => string | undefined,
): string | undefined {
  if (isKanaOnly(wordJa)) return undefined
  const r = overrides?.reading ?? pickReading(wordJa)
  return r?.trim() || undefined
}

function classifyNote(note: ExtractedAnkiNote): ClassifiedNote {
  const [frontRaw = "", backRaw = ""] = note.fields
  const front = stripHtml(frontRaw)
  const back = stripHtml(backRaw)
  const raw = `${frontRaw}\n${backRaw}`
  let kind: NoteClass = "other"

  // Gap-marked notes are grammar *candidates*. The user confirms grammar vs
  // vocab later (see GrammarDecisionMap); the candidate stays classified as
  // grammar here and the decision is applied when cards are built.
  if (hasGapMarker(raw)) {
    kind = "grammar"
  } else if (note.noteType === "Basic (type in the answer)") {
    kind = "type"
  } else if (
    note.noteType === "Basic" &&
    // The word side is either a quote-wrapped Japanese word ("«陣»") or a word
    // annotated with "の読み" ("陣の読み"); the hiragana side is bare or
    // quote-wrapped kana, optionally also carrying "の読み".
    (isWrappedJapanese(front) || hasReadingSuffix(front)) &&
    isKanaOnly(readingValue(back))
  ) {
    kind = "reading"
  } else if (
    note.noteType === "Basic" &&
    surfaceHasKanji(front) &&
    !isWrappedJapanese(front)
  ) {
    kind = "basic"
  } else if (note.noteType === "Basic" && isKanaOnly(front)) {
    kind = "kana"
  } else if (note.noteType.toLowerCase().includes("reversed")) {
    kind = "reversed"
  } else if (note.noteType === "Basic") {
    kind = "other"
  }

  return { note, kind, front, back, frontRaw, backRaw }
}

/**
 * The side of a reversed note that holds the Japanese word. The other side is
 * the English meaning and/or an image, so pick whichever field actually
 * contains Japanese rather than assuming the front (or assuming kana).
 */
function reversedJapaneseSide(entry: ClassifiedNote): string {
  if (containsJapanese(entry.front)) return entry.front
  if (containsJapanese(entry.back)) return entry.back
  return entry.front
}

/** When Anki has fewer sibling cards than Benkyou review modes, reuse real scheduling instead of a synthetic “new” row (which was always due immediately). */
function pickFallbackSchedulingSource(
  modes: ReviewModeId[],
  sources: ModeSchedulingMap,
): AnkiSchedulingSource | undefined {
  for (const modeId of modes) {
    const s = sources[modeId]
    if (s) return s
  }
  return undefined
}

function schedulingRows(
  cardId: string,
  modes: ReviewModeId[],
  sources: ModeSchedulingMap,
  collectionCrt: number,
  updatedAt: number,
): SchedulingRow[] {
  const fallbackSource = pickFallbackSchedulingSource(modes, sources)
  return modes.map((modeId) => {
    const source = sources[modeId] ?? fallbackSource
    if (!source) {
      const fsrs = serializeFsrs(createEmptyCard(new Date()))
      return {
        id: `${cardId}:${modeId}`,
        cardId,
        modeId,
        fsrs,
        due: fsrs.due,
        updatedAt,
      }
    }
    const fsrs = ankiSchedulingToFsrs(source, collectionCrt)
    return {
      id: `${cardId}:${modeId}`,
      cardId,
      modeId,
      fsrs,
      due: fsrs.due,
      updatedAt,
    }
  })
}

function mediaIdsForRefs(
  refs: string[],
  mediaPaths: Record<string, string>,
  mediaByFilename: Map<string, BulkMediaItem>,
): string[] {
  const ids: string[] = []
  for (const ref of refs) {
    if (!mediaPaths[ref]) continue
    const item = mediaByFilename.get(ref)
    if (item) ids.push(item.id)
  }
  return [...new Set(ids)]
}

function mediaContentKey(bytes: Uint8Array): string {
  // Cheap, deterministic, sync fingerprint of a media payload. Real image
  // bytes have high entropy in their first ~64 bytes (JPEG/PNG headers +
  // pixel-stream start), so length + first-64-bytes-hex is unique enough
  // for the in-import dedup pass.
  const n = Math.min(64, bytes.length)
  let hex = ""
  for (let i = 0; i < n; i++) hex += bytes[i].toString(16).padStart(2, "0")
  return bytes.length + ":" + hex
}

function buildMediaItems(
  pkg: ExtractedPackage,
  readFile: (relativePath: string) => Uint8Array,
): Map<string, BulkMediaItem> {
  // Anki users frequently paste the same image into a "Basic" note AND a
  // "Basic (type)" note; Anki stores each paste under its own filename, so a
  // card merging those two notes would otherwise reference the same picture
  // under two ids and render it twice during review. Collapse identical-byte
  // media into a single canonical item; multiple filenames are allowed to
  // map to the same item.
  const byContent = new Map<string, BulkMediaItem>()
  const byFilename = new Map<string, BulkMediaItem>()
  for (const [filename, relativePath] of Object.entries(pkg.mediaPaths)) {
    const bytes = readFile(relativePath)
    const key = mediaContentKey(bytes)
    let item = byContent.get(key)
    if (!item) {
      item = {
        id: stableMediaId(filename),
        mimeType: mimeFromFilename(filename),
        bytes,
      }
      byContent.set(key, item)
    }
    byFilename.set(filename, item)
  }
  return byFilename
}

function vocabularyCard(
  deckId: string,
  cardId: string,
  content: VocabularyCardContent,
  meta: Record<string, unknown> | undefined,
  sources: ModeSchedulingMap,
  collectionCrt: number,
  updatedAt: number,
): { card: Card; scheduling: SchedulingRow[] } {
  const card: Card = {
    id: cardId,
    deckId,
    kind: "vocabulary",
    content,
    updatedAt,
    ...(meta !== undefined ? { meta } : {}),
  }
  return {
    card,
    scheduling: schedulingRows(
      cardId,
      reviewModesForCard(card),
      sources,
      collectionCrt,
      updatedAt,
    ),
  }
}

function grammarCard(
  deckId: string,
  cardId: string,
  content: GrammarCardContent,
  sources: ModeSchedulingMap,
  collectionCrt: number,
  updatedAt: number,
): { card: Card; scheduling: SchedulingRow[] } {
  const card: Card = {
    id: cardId,
    deckId,
    kind: "grammar",
    content,
    updatedAt,
  }
  return {
    card,
    scheduling: schedulingRows(
      cardId,
      reviewModesForCard(card),
      sources,
      collectionCrt,
      updatedAt,
    ),
  }
}

function firstCard(note: ExtractedAnkiNote, ord = 0) {
  return note.cards.find((c) => c.ord === ord) ?? note.cards[0]
}

function buildGrammarGroups(classified: ClassifiedNote[]) {
  const mediaKey = (entry: ClassifiedNote) =>
    extractMediaRefs(`${entry.frontRaw}\n${entry.backRaw}`).sort().join("|")

  const grammarGroups = new Map<string, ClassifiedNote[]>()
  const grammarAnchors = classified.filter((entry) => entry.kind === "grammar")
  for (const entry of grammarAnchors) {
    const gapRaw = hasGapMarker(entry.frontRaw) ? entry.frontRaw : entry.backRaw
    const key = stripHtml(gapRaw).replace(/\s+/g, " ")
    const list = grammarGroups.get(key) ?? []
    list.push(entry)
    grammarGroups.set(key, list)
  }

  const attachToGroup = (anchor: ClassifiedNote, entry: ClassifiedNote) => {
    const gapRaw = hasGapMarker(anchor.frontRaw) ? anchor.frontRaw : anchor.backRaw
    const key = stripHtml(gapRaw).replace(/\s+/g, " ")
    const list = grammarGroups.get(key) ?? []
    if (!list.some((item) => item.note.id === entry.note.id)) {
      list.push(entry)
      grammarGroups.set(key, list)
    }
  }

  for (const entry of classified) {
    if (entry.kind === "grammar") continue
    const refs = mediaKey(entry)
    const anchorByMedia = grammarAnchors.find(
      (grammar) => mediaKey(grammar) === refs && mediaKey(grammar).length > 0,
    )
    if (anchorByMedia) {
      attachToGroup(anchorByMedia, entry)
      continue
    }
    const anchorByConstruction = grammarAnchors.find((grammar) => {
      const answerRaw = hasGapMarker(grammar.frontRaw)
        ? grammar.backRaw
        : grammar.frontRaw
      const construction = normalizeConstruction(stripHtml(answerRaw))
      if (!construction) return false
      return construction
        .split(", ")
        .every((part) => part && entry.front.includes(part))
    })
    if (anchorByConstruction) attachToGroup(anchorByConstruction, entry)
  }

  const grammarReserved = new Set<number>()
  for (const entries of grammarGroups.values()) {
    for (const entry of entries) grammarReserved.add(entry.note.id)
  }

  return { grammarGroups, grammarReserved }
}

/** Shared view of a grammar group: its anchor note, gapped sentence, and answer. */
function grammarGroupParts(entries: ClassifiedNote[]) {
  const typeEntry = entries.find((entry) =>
    entry.note.noteType.toLowerCase().includes("type"),
  )
  const primary = typeEntry ?? entries[0]
  const gapRaw = hasGapMarker(primary.frontRaw)
    ? primary.frontRaw
    : primary.backRaw
  const answerRaw = hasGapMarker(primary.frontRaw)
    ? primary.backRaw
    : primary.frontRaw
  return {
    typeEntry,
    primary,
    sentenceWithGap: normalizeGapMarkers(stripHtml(gapRaw)),
    construction: normalizeConstruction(stripHtml(answerRaw)),
  }
}

/**
 * Notes that look like grammar (a gap marker is present), one entry per merged
 * group, for the user to confirm as grammar or vocab before any card is built.
 */
export function collectGrammarCandidates(
  pkg: ExtractedPackage,
): GrammarCandidate[] {
  const classified = pkg.notes.map(classifyNote)
  const { grammarGroups } = buildGrammarGroups(classified)
  const candidates: GrammarCandidate[] = []
  for (const [key, entries] of grammarGroups) {
    const { sentenceWithGap, construction } = grammarGroupParts(entries)
    const imageCount = new Set(
      entries.flatMap((entry) =>
        extractMediaRefs(`${entry.frontRaw}\n${entry.backRaw}`),
      ),
    ).size
    candidates.push({ key, sentence: sentenceWithGap, construction, imageCount })
  }
  return candidates
}

export function convertExtractedPackage(
  pkg: ExtractedPackage,
  readFile: (relativePath: string) => Uint8Array,
  /** Grammar groups the user marked "vocab" are built as word cards instead. */
  decisions: GrammarDecisionMap = {},
): BulkImportPayload {
  const updatedAt = Date.now()
  const deckId = stableCardId("deck", [pkg.deckId])
  const mediaByFilename = buildMediaItems(pkg, readFile)
  const classified = pkg.notes.map(classifyNote)

  const cards: Card[] = []
  const scheduling: SchedulingRow[] = []
  const usedNoteIds = new Set<number>()

  const byKind = (kind: NoteClass) =>
    classified.filter((entry) => entry.kind === kind)

  const markUsed = (...notes: ClassifiedNote[]) => {
    for (const note of notes) usedNoteIds.add(note.note.id)
  }

  const refsFrom = (...htmlParts: string[]) =>
    mediaIdsForRefs(
      htmlParts.flatMap(extractMediaRefs),
      pkg.mediaPaths,
      mediaByFilename,
    )

  const readingByKey = new Map<string, ClassifiedNote>()
  for (const entry of byKind("reading")) {
    readingByKey.set(normalizeHeadwordKey(entry.front), entry)
  }

  const basicByKey = new Map<string, ClassifiedNote>()
  for (const entry of byKind("basic")) {
    basicByKey.set(normalizeHeadwordKey(entry.front), entry)
  }

  const typeByKey = new Map<string, ClassifiedNote>()
  for (const entry of byKind("type")) {
    typeByKey.set(normalizeHeadwordKey(entry.back), entry)
  }

  const reversedByKey = new Map<string, ClassifiedNote>()
  for (const entry of byKind("reversed")) {
    reversedByKey.set(normalizeHeadwordKey(reversedJapaneseSide(entry)), entry)
  }

  const { grammarGroups, grammarReserved } = buildGrammarGroups(classified)

  const pickReading = (word: string): string | undefined => {
    const key = normalizeHeadwordKey(word)
    const reading = readingByKey.get(key)
    return reading ? readingValue(reading.back) : undefined
  }

  const mergeVocabulary = (
    wordJa: string,
    basic: ClassifiedNote | undefined,
    type: ClassifiedNote | undefined,
    reading: ClassifiedNote | undefined,
    reversed?: ClassifiedNote,
    overrides?: Partial<VocabularyCardContent> & {
      meta?: Record<string, unknown>
    },
  ) => {
    // A reversed note's English/image can live on either side, so feed both of
    // its raw fields to the English/image extractors.
    const definitions = extractEnglishLines(
      basic?.backRaw ?? "",
      type?.frontRaw ?? "",
      reversed?.frontRaw ?? "",
      reversed?.backRaw ?? "",
    )
    const images = refsFrom(
      basic?.backRaw ?? "",
      type?.frontRaw ?? "",
      reversed?.frontRaw ?? "",
      reversed?.backRaw ?? "",
    )
    const wordReading = vocabularyReading(wordJa, overrides, pickReading)
    const content: VocabularyCardContent = {
      wordJa,
      reading: wordReading,
      definitionsEn:
        overrides?.definitionsEn ??
        defaultDefinitionsEn(definitions),
      images: overrides?.images ?? images,
      exampleSentences: overrides?.exampleSentences ?? [],
      synonymsJa: [],
    }
    // A reversed note carries two Anki cards (forward + reverse); fall back to
    // them for the oral / type-the-word modes when there's no Basic/type note.
    const sources: ModeSchedulingMap = {
      vocab_oral_en: basic
        ? firstCard(basic.note)
        : reversed
          ? firstCard(reversed.note, 0)
          : undefined,
      vocab_type_word_from_clue: type
        ? firstCard(type.note)
        : reversed
          ? firstCard(reversed.note, 1)
          : undefined,
      vocab_type_reading: reading ? firstCard(reading.note) : undefined,
    }
    const meta = overrides?.meta
    const cardId = stableCardId("vocab", [
      basic?.note.id ??
        type?.note.id ??
        reading?.note.id ??
        reversed?.note.id ??
        wordJa,
    ])
    const built = vocabularyCard(
      deckId,
      cardId,
      content,
      meta,
      sources,
      pkg.collectionCrt,
      updatedAt,
    )
    cards.push(built.card)
    scheduling.push(...built.scheduling)
    markUsed(
      ...[basic, type, reading, reversed].filter(
        (entry): entry is ClassifiedNote => Boolean(entry),
      ),
    )
  }

  const vocabKeys = new Set([
    ...basicByKey.keys(),
    ...typeByKey.keys(),
    ...readingByKey.keys(),
    ...reversedByKey.keys(),
  ])
  for (const key of vocabKeys) {
    const basic = basicByKey.get(key)
    const type = typeByKey.get(key)
    const reading = readingByKey.get(key)
    const reversed = reversedByKey.get(key)
    if (!basic && !type && !reading && !reversed) continue
    if (grammarReserved.has(basic?.note.id ?? -1)) continue
    if (grammarReserved.has(type?.note.id ?? -1)) continue
    if (usedNoteIds.has(basic?.note.id ?? -1)) continue
    if (usedNoteIds.has(type?.note.id ?? -1)) continue
    if (usedNoteIds.has(reading?.note.id ?? -1)) continue
    if (usedNoteIds.has(reversed?.note.id ?? -1)) continue
    const wordJa = stripReadingSuffix(
      unwrapJapanese(
        basic?.front ??
          type?.back ??
          reading?.front ??
          (reversed ? reversedJapaneseSide(reversed) : undefined) ??
          key,
      ),
    )
    mergeVocabulary(wordJa, basic, type, reading, reversed)
  }

  for (const entry of byKind("reading")) {
    if (usedNoteIds.has(entry.note.id)) continue
    mergeVocabulary(
      stripReadingSuffix(unwrapJapanese(entry.front)),
      undefined,
      undefined,
      entry,
    )
  }

  for (const [sentenceKey, entries] of grammarGroups) {
    const { typeEntry, primary, sentenceWithGap, construction } =
      grammarGroupParts(entries)
    const images = refsFrom(
      ...entries.flatMap((entry) => [entry.frontRaw, entry.backRaw]),
    )

    // User confirmed this gap-marked group is really a vocabulary card that
    // merely includes an example sentence — build a word card and keep the
    // sentence rather than turning it into grammar.
    if (decisions[sentenceKey] === "vocab") {
      const wordJa = unwrapJapanese(construction) || sentenceWithGap
      const definitions = extractEnglishLines(
        ...entries.flatMap((entry) => [entry.frontRaw, entry.backRaw]),
      )
      const content: VocabularyCardContent = {
        wordJa,
        reading: vocabularyReading(wordJa, undefined, pickReading),
        definitionsEn: defaultDefinitionsEn(definitions),
        images,
        exampleSentences: sentenceWithGap ? [sentenceWithGap] : [],
        synonymsJa: [],
      }
      const sources: ModeSchedulingMap = {
        vocab_oral_en: firstCard(primary.note),
        vocab_type_word_from_clue: typeEntry
          ? firstCard(typeEntry.note)
          : undefined,
      }
      const built = vocabularyCard(
        deckId,
        stableCardId("vocab", [primary.note.id]),
        content,
        undefined,
        sources,
        pkg.collectionCrt,
        updatedAt,
      )
      cards.push(built.card)
      scheduling.push(...built.scheduling)
      markUsed(...entries)
      continue
    }

    let translationEn =
      extractEnglishLines(
        ...entries.flatMap((entry) => [entry.frontRaw, entry.backRaw]),
      ).join(" ")
    if (
      translationEn &&
      normalizeConstruction(translationEn) === construction
    ) {
      translationEn = ""
    }
    if (!translationEn) translationEn = ""
    const readings: Record<string, string> = {}
    const lemma = construction.split(",")[0]?.trim() ?? ""
    const reading = pickReading(lemma)
    if (lemma && reading) readings[lemma] = reading

    const content: GrammarCardContent = {
      sentenceWithGap,
      gapMarker: "___",
      construction,
      translationEn,
      readings,
      images,
      synonymsJa: [],
    }
    const sources: ModeSchedulingMap = {
      grammar_type_construction: typeEntry
        ? firstCard(typeEntry.note)
        : firstCard(primary.note),
      grammar_oral_meaning: entries.find((entry) => entry !== typeEntry)
        ? firstCard(
            (entries.find((entry) => entry !== typeEntry) ?? primary).note,
          )
        : undefined,
    }
    const built = grammarCard(
      deckId,
      stableCardId("grammar", [sentenceKey.slice(0, 40), primary.note.id]),
      content,
      sources,
      pkg.collectionCrt,
      updatedAt,
    )
    cards.push(built.card)
    scheduling.push(...built.scheduling)
    markUsed(...entries)
  }

  // General fallback: import any note we didn't otherwise place as a best-effort
  // vocabulary card rather than dropping it. A "type" note's answer is its back
  // field; every other kind's headword is its front.
  for (const entry of classified) {
    if (usedNoteIds.has(entry.note.id)) continue
    const isType = entry.note.noteType.toLowerCase().includes("type")
    const wordJa = unwrapJapanese(isType ? entry.back : entry.front)
    mergeVocabulary(
      wordJa,
      isType ? undefined : entry,
      isType ? entry : undefined,
      undefined,
    )
  }

  return {
    deck: { id: deckId, name: pkg.deckName, updatedAt },
    cards,
    scheduling,
    // mediaByFilename can map multiple filenames to the same canonical item;
    // dedup by identity here so we don't write the same Dexie row / Storage
    // blob more than once per import.
    media: [...new Set(mediaByFilename.values())],
  }
}
