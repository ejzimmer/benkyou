import { isKana, toHiragana } from 'wanakana'
import type { Subject } from '../api/types'
import { convertToHiragana } from './convertToHiragana'
import { matchesKanaInQuestion } from './matchesKanaInQuestion'

export type ReadingResult = 'correct' | 'incorrect' | 'not-kana' | 'kana-mismatch' | 'onyomi-wanted' | 'kunyomi-wanted' | 'meaning-given'

export function checkReading(answer: string, subject: Subject): ReadingResult {
  const given = convertToHiragana(answer)
  if (!isKana(given)) return 'not-kana'

  const reading = subject.readings?.find((r) => toHiragana(r.reading) === given)
  if (!reading && isMeaningInKana(given, subject)) return 'meaning-given'
  if (subject.characters && !matchesKanaInQuestion(given, subject.characters)) return 'kana-mismatch'
  if (!reading) return 'incorrect'
  if (reading.accepted_answer) return 'correct'
  return getWantedReadingType(subject) ?? 'incorrect'
}

// The reading box turns romaji into kana as it's typed, so a meaning typed there arrives as kana: "one" becomes おね.
function isMeaningInKana(answer: string, subject: Subject) {
  return [
    ...subject.meanings.filter((m) => m.accepted_answer).map((m) => m.meaning),
    ...subject.auxiliary_meanings.filter((m) => m.type === 'whitelist').map((m) => m.meaning),
  ].some((meaning) => convertToHiragana(meaning) === answer)
}

function getWantedReadingType(subject: Subject) {
  const wanted = subject.readings?.find((reading) => reading.accepted_answer)?.type
  if (wanted === 'onyomi') return 'onyomi-wanted'
  if (wanted === 'kunyomi') return 'kunyomi-wanted'
  return null
}
