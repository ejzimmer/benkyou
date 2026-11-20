import { isKanji, toHiragana } from 'wanakana'
import { removeIgnoredCharacters } from './convertToHiragana'

// Kana shown in the question must appear in the same place in the answer:
// for 食べる, an answer has to end in べる. Each run of kanji can stand for any kana.
export function matchesKanaInQuestion(answer: string, characters: string) {
  const pattern = [...removeIgnoredCharacters(characters)]
    .map((character) => (isKanji(character) ? '.+' : escape(toHiragana(character))))
    .join('')
    .replaceAll(/(\.\+)+/gu, '.+')
  return new RegExp(`^${pattern}$`, 'u').test(answer)
}

function escape(text: string) {
  return text.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`)
}
