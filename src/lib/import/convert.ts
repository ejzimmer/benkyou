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
  containsKanji as surfaceHasKanji,
  extractEnglishLines,
  extractMediaRefs,
  hasGapMarker,
  isKanaOnly,
  isWrappedJapanese,
  mimeFromFilename,
  normalizeConstruction,
  normalizeGapMarkers,
  normalizeHeadwordKey,
  stripHtml,
  unwrapJapanese,
} from "./html"
import type {
  AnkiSchedulingSource,
  BulkImportPayload,
  BulkMediaItem,
  ExtractedAnkiNote,
  ExtractedPackage,
  ModeSchedulingMap,
} from "./types"

const SKIP_NOTE_IDS = new Set([1772835136568, 1772835085326])

const MEMORY_NOTE_IDS = new Set([1771017599643, 1771017640246])

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

  if (MEMORY_NOTE_IDS.has(note.id)) {
    kind = "basic"
  } else if (hasGapMarker(raw) && !SKIP_NOTE_IDS.has(note.id)) {
    kind = "grammar"
  } else if (note.noteType === "Basic (type in the answer)") {
    kind = "type"
  } else if (
    note.noteType === "Basic" &&
    isWrappedJapanese(front) &&
    isKanaOnly(back)
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

function buildMediaItems(
  pkg: ExtractedPackage,
  readFile: (relativePath: string) => Uint8Array,
): Map<string, BulkMediaItem> {
  const map = new Map<string, BulkMediaItem>()
  for (const [filename, relativePath] of Object.entries(pkg.mediaPaths)) {
    const bytes = readFile(relativePath)
    map.set(filename, {
      id: stableMediaId(filename),
      mimeType: mimeFromFilename(filename),
      bytes,
    })
  }
  return map
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

export function convertExtractedPackage(
  pkg: ExtractedPackage,
  readFile: (relativePath: string) => Uint8Array,
): BulkImportPayload {
  const updatedAt = Date.now()
  const deckId = stableCardId("deck", [pkg.deckId])
  const mediaByFilename = buildMediaItems(pkg, readFile)
  const classified = pkg.notes
    .filter((note) => !SKIP_NOTE_IDS.has(note.id))
    .map(classifyNote)

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

  const { grammarGroups, grammarReserved } = buildGrammarGroups(classified)

  const pickReading = (word: string): string | undefined => {
    const key = normalizeHeadwordKey(word)
    const reading = readingByKey.get(key)
    return reading?.back
  }

  const mergeVocabulary = (
    wordJa: string,
    basic: ClassifiedNote | undefined,
    type: ClassifiedNote | undefined,
    reading: ClassifiedNote | undefined,
    overrides?: Partial<VocabularyCardContent> & {
      meta?: Record<string, unknown>
    },
  ) => {
    const definitions = extractEnglishLines(
      basic?.backRaw ?? "",
      type?.frontRaw ?? "",
    )
    const images = refsFrom(basic?.backRaw ?? "", type?.frontRaw ?? "")
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
    const sources: ModeSchedulingMap = {
      vocab_oral_en: basic ? firstCard(basic.note) : undefined,
      vocab_type_word_from_clue: type ? firstCard(type.note) : undefined,
      vocab_type_reading: reading ? firstCard(reading.note) : undefined,
    }
    const meta = overrides?.meta
    const cardId = stableCardId("vocab", [
      basic?.note.id ?? type?.note.id ?? reading?.note.id ?? wordJa,
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
      ...[basic, type, reading].filter((entry): entry is ClassifiedNote =>
        Boolean(entry),
      ),
    )
  }

  mergeVocabulary(
    "記憶",
    classified.find((entry) => entry.note.id === 1771017599643),
    classified.find((entry) => entry.note.id === 1771017640246),
    undefined,
    {
      reading: "きおく",
      definitionsEn: ["memory"],
      exampleSentences: ["禁止魔法を使った人が___も消されずに"],
      images: refsFrom(
        classified.find((entry) => entry.note.id === 1771017599643)?.backRaw ??
          "",
        classified.find((entry) => entry.note.id === 1771017640246)?.frontRaw ??
          "",
      ),
    },
  )

  mergeVocabulary(
    "お手本をなぞる",
    classified.find((entry) => entry.note.id === 1776465272977),
    classified.find((entry) => entry.note.id === 1776465307565),
    readingByKey.get(normalizeHeadwordKey("お手本")),
    {
      reading: "おてほん",
    },
  )

  const omakeBasic = classified.find((entry) => entry.note.id === 1773453941497)
  const omakeReverse = classified.find(
    (entry) => entry.note.id === 1773453961600,
  )
  if (omakeBasic && omakeReverse) {
    mergeVocabulary("おまけ", omakeBasic, omakeReverse, undefined)
  }

  const vocabKeys = new Set([
    ...basicByKey.keys(),
    ...typeByKey.keys(),
    ...readingByKey.keys(),
  ])
  for (const key of vocabKeys) {
    if (
      key === normalizeHeadwordKey("記憶") ||
      key === normalizeHeadwordKey("お手本をなぞる") ||
      key === normalizeHeadwordKey("おまけ")
    ) {
      continue
    }
    const basic = basicByKey.get(key)
    const type = typeByKey.get(key)
    const reading = readingByKey.get(key)
    if (!basic && !type && !reading) continue
    if (grammarReserved.has(basic?.note.id ?? -1)) continue
    if (grammarReserved.has(type?.note.id ?? -1)) continue
    if (usedNoteIds.has(basic?.note.id ?? -1)) continue
    if (usedNoteIds.has(type?.note.id ?? -1)) continue
    if (usedNoteIds.has(reading?.note.id ?? -1)) continue
    const wordJa = unwrapJapanese(basic?.front ?? type?.back ?? reading?.front ?? key)
    mergeVocabulary(wordJa, basic, type, reading)
  }

  for (const entry of byKind("reading")) {
    if (usedNoteIds.has(entry.note.id)) continue
    mergeVocabulary(unwrapJapanese(entry.front), undefined, undefined, entry)
  }

  for (const entry of byKind("reversed")) {
    if (usedNoteIds.has(entry.note.id)) continue
    const wordJa = isKanaOnly(entry.front) ? entry.front : entry.back
    const english = isKanaOnly(entry.front) ? entry.back : entry.front
  const definitions = extractEnglishLines(entry.frontRaw, entry.backRaw)
    const images = refsFrom(entry.frontRaw, entry.backRaw)
    const wordReading = vocabularyReading(wordJa, undefined, pickReading)
    const defs =
      definitions.length > 0
        ? definitions
        : english && !surfaceHasKanji(english)
          ? [english]
          : []
    const content: VocabularyCardContent = {
      wordJa,
      reading: wordReading,
      definitionsEn: defaultDefinitionsEn(defs),
      images,
      exampleSentences: [],
      synonymsJa: [],
    }
    const sources: ModeSchedulingMap = {
      vocab_oral_en: firstCard(entry.note, 0),
      vocab_type_word_from_clue: firstCard(entry.note, 1),
    }
    const built = vocabularyCard(
      deckId,
      stableCardId("vocab", [entry.note.id]),
      content,
      undefined,
      sources,
      pkg.collectionCrt,
      updatedAt,
    )
    cards.push(built.card)
    scheduling.push(...built.scheduling)
    markUsed(entry)
  }

  for (const [sentenceKey, entries] of grammarGroups) {
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
    const sentenceWithGap = normalizeGapMarkers(stripHtml(gapRaw))
    const construction = normalizeConstruction(stripHtml(answerRaw))
    const images = refsFrom(
      ...entries.flatMap((entry) => [entry.frontRaw, entry.backRaw]),
    )
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

  const unused = classified.filter((entry) => !usedNoteIds.has(entry.note.id))
  if (unused.length > 0) {
    const ids = unused.map((entry) => `${entry.note.id}:${entry.kind}`).join(", ")
    throw new Error(`Unmapped Anki notes: ${ids}`)
  }

  return {
    deck: { id: deckId, name: pkg.deckName, updatedAt },
    cards,
    scheduling,
    media: [...mediaByFilename.values()],
  }
}
