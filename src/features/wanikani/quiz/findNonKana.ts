import { isKana, toKana } from 'wanakana'

// Each character is converted on its own, so a trailing "n" still waiting to become ん counts as kana.
export function findNonKana(answer: string): number[] {
  return [...answer].flatMap((character, index) => (isKana(toKana(character)) ? [] : [index]))
}
