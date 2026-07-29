/**
 * Pure logic for the AI-agent translation-exercise API (see
 * docs/AGENT_API.md). Kept free of Firestore/Netlify types so it can be unit
 * tested directly; `netlify/functions/agent-*.ts` do the I/O and call in here.
 */
import { Rating, State, type Grade } from "ts-fsrs"
import type { Card, ReviewModeId } from "../../src/domain/types"
import { reviewModesForCard } from "../../src/domain/types"
import type { SchedulingRow } from "../../src/lib/db/schema"
import { deserializeFsrs } from "../../src/lib/srs/schedule"

/**
 * The one review mode per card kind where the prompt is "produce the
 * Japanese" (a clue/translation in, the word or construction out) — the
 * shape of a translation exercise. The other modes (reading, oral-meaning)
 * go the opposite direction and aren't useful for this API.
 */
const TRANSLATION_MODE_FOR_KIND: Record<Card["kind"], ReviewModeId> = {
  vocabulary: "vocab_type_word_from_clue",
  grammar: "grammar_type_construction",
}

export function translationModeForCard(card: Card): ReviewModeId {
  return TRANSLATION_MODE_FOR_KIND[card.kind]
}

export function japaneseWordForCard(card: Card): string {
  return card.kind === "vocabulary" ? card.content.wordJa : card.content.construction
}

export type AgentCard = {
  id: string
  kind: Card["kind"]
  japaneseWord: string
  meaning: string
  exampleSentences: string[]
  due: number
}

export function toAgentCard(card: Card, due: number): AgentCard {
  if (card.kind === "vocabulary") {
    return {
      id: card.id,
      kind: "vocabulary",
      japaneseWord: card.content.wordJa,
      meaning: card.content.definitionsEn.filter((d) => d.trim()).join("; "),
      exampleSentences: card.content.exampleSentences,
      due,
    }
  }
  return {
    id: card.id,
    kind: "grammar",
    japaneseWord: card.content.construction,
    meaning: card.content.translationEn,
    exampleSentences: [card.content.sentenceWithGap],
    due,
  }
}

/** Due (as of `now`), on the translation mode, and that mode still applies to the card's current content. */
export function isDueForTranslation(
  card: Card,
  row: SchedulingRow,
  now: number,
): boolean {
  if (row.due > now) return false
  if (row.modeId !== translationModeForCard(card)) return false
  return reviewModesForCard(card).includes(row.modeId)
}

const DAY_MS = 86_400_000

/**
 * Firestore only mirrors `scheduling` rows, not the local-only `reviewEvents`
 * audit log (see lib/db/schema.ts), so "gotten wrong recently" can't be read
 * directly server-side. Approximate it from the FSRS state that *is*
 * mirrored: a card mid-relearning-step just failed its last review, a high
 * lifetime lapse count means it's chronically shaky, and low stability means
 * it's about to be forgotten again regardless of lapse history.
 */
export function schedulingPriorityWeight(row: SchedulingRow, now: number): number {
  const fsrs = deserializeFsrs(row.fsrs)
  const daysOverdue = Math.max(0, (now - row.due) / DAY_MS)
  const overdueBonus = Math.min(daysOverdue, 14)
  const relearningBonus = fsrs.state === State.Relearning ? 5 : 0
  const lapsesBonus = Math.min(fsrs.lapses, 5) * 1.5
  const fragileBonus = fsrs.stability > 0 && fsrs.stability < 3 ? 3 : 0
  return 1 + overdueBonus + relearningBonus + lapsesBonus + fragileBonus
}

/** Weighted random pick, without replacement, biggest weights most likely but never guaranteed. */
export function weightedSampleWithoutReplacement<T>(
  items: readonly { item: T; weight: number }[],
  count: number,
  random: () => number = Math.random,
): T[] {
  const pool = items.map((entry) => ({ ...entry }))
  const picked: T[] = []
  while (pool.length > 0 && picked.length < count) {
    const total = pool.reduce((sum, entry) => sum + entry.weight, 0)
    let remaining = random() * total
    let index = pool.length - 1
    for (let i = 0; i < pool.length; i += 1) {
      remaining -= pool[i].weight
      if (remaining <= 0) {
        index = i
        break
      }
    }
    picked.push(pool[index].item)
    pool.splice(index, 1)
  }
  return picked
}

export const AGENT_RATINGS = ["easy", "ok", "hard", "incorrect"] as const
export type AgentRating = (typeof AGENT_RATINGS)[number]

export function isAgentRating(value: unknown): value is AgentRating {
  return (
    typeof value === "string" &&
    (AGENT_RATINGS as readonly string[]).includes(value)
  )
}

export function ratingToGrade(rating: AgentRating): Grade {
  switch (rating) {
    case "easy":
      return Rating.Easy
    case "ok":
      return Rating.Good
    case "hard":
      return Rating.Hard
    case "incorrect":
      return Rating.Again
  }
}
