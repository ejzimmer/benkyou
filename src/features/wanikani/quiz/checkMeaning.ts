import { isJapanese, isKana, isKanji, toHiragana } from 'wanakana'
import type { Subject } from '../api/types'
import { convertToHiragana } from './convertToHiragana'
import { matchesKanaInQuestion } from './matchesKanaInQuestion'

export type MeaningResult = 'correct' | 'incorrect' | 'not-english' | 'reading-given'

export function checkMeaning(answer: string, subject: Subject, synonyms: readonly string[] = []): MeaningResult {
  if (isJapanese(answer.replaceAll(/\s/gu, ''))) return 'not-english'

  const given = normalise(answer)

  const blacklisted = subject.auxiliary_meanings.filter((m) => m.type === 'blacklist').map((m) => normalise(m.meaning))
  if (blacklisted.includes(given)) return 'incorrect'

  const accepted = [
    ...subject.meanings.filter((m) => m.accepted_answer).map((m) => m.meaning),
    ...subject.auxiliary_meanings.filter((m) => m.type === 'whitelist').map((m) => m.meaning),
    ...synonyms,
  ].map((meaning) => normalise(meaning))

  const isCloseEnough = (meaning: string) => getEditDistance(given, meaning) <= getAllowedTypos(meaning)
  if (accepted.some((meaning) => isCloseEnough(meaning))) return 'correct'
  return isReadingInRomaji(answer, subject) ? 'reading-given' : 'incorrect'
}

function isReadingInRomaji(answer: string, subject: Subject) {
  const given = convertToHiragana(answer)
  if (!isKana(given)) return false
  if (subject.readings?.some((reading) => toHiragana(reading.reading) === given)) return true
  return matchesOkurigana(given, subject.characters)
}

function matchesOkurigana(answer: string, characters: string | null) {
  if (!characters) return false
  const characterList = [...characters]
  const hasOkurigana = characterList.some((character) => isKanji(character)) && characterList.some((character) => isKana(character))
  return hasOkurigana && matchesKanaInQuestion(answer, characters)
}

function normalise(text: string) {
  return text
    .toLowerCase()
    .replaceAll(/[-.'’!?,/]/gu, ' ')
    .replaceAll(/\s+/gu, ' ')
    .trim()
}

// Roughly the official app's tolerance: none for short answers, growing with length.
function getAllowedTypos(meaning: string) {
  if (meaning.length <= 3) return 0
  if (meaning.length <= 5) return 1
  if (meaning.length <= 7) return 2
  return 2 + Math.floor(meaning.length / 7)
}

function getEditDistance(a: string, b: string) {
  let previousRow = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) {
      const substitution = previousRow[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      row.push(Math.min(previousRow[j] + 1, row[j - 1] + 1, substitution))
    }
    previousRow = row
  }
  return previousRow[b.length]
}
