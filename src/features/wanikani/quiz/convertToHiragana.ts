import { toHiragana } from 'wanakana'

// Spaces, punctuation and the 〜 that marks where a word attaches (我が〜) are never part of a reading.
const IGNORED_CHARACTERS = /[\s\p{P}〜～~]/gu

export function removeIgnoredCharacters(text: string) {
  return text.replaceAll(IGNORED_CHARACTERS, '')
}

export function convertToHiragana(text: string) {
  return toHiragana(removeIgnoredCharacters(text))
}
