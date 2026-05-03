import { normalizeJapanese } from "./normalize"
import type { Card } from "../../domain/types"

export function isSynonymAnswer(card: Card, typed: string): boolean {
  const t = normalizeJapanese(typed)
  if (!t) return false
  const syns =
    card.kind === "vocabulary"
      ? card.content.synonymsJa
      : card.content.synonymsJa
  for (const s of syns) {
    if (normalizeJapanese(s) === t) return true
  }
  return false
}

export function matchesPrimaryJapanese(card: Card, typed: string): boolean {
  const t = normalizeJapanese(typed)
  if (!t) return false
  if (card.kind === "vocabulary") {
    const matchesWord = normalizeJapanese(card.content.wordJa) === t
    const matchesReading =
      Boolean(card.content.reading?.trim()) &&
      normalizeJapanese(card.content.reading ?? "") === t
    return matchesWord || matchesReading
  }
  return normalizeJapanese(card.content.construction) === t
}
