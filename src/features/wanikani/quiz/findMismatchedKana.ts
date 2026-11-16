import { isKanji, toHiragana } from 'wanakana'
import { removeIgnoredCharacters } from './convertToHiragana'

type Token = { kind: 'kanji' } | { kind: 'kana'; kana: string }

interface Alignment {
  cost: number
  mismatchedIndexes: number[]
}

// Each run of kanji in the question can stand for one or more kana in the answer,
// so for 食べる, only the last た in たべた is wrong.
export function findMismatchedKana(answer: string, characters: string): number[] {
  const answerKana = [...answer].map((character) => toHiragana(character))
  const tokens = tokeniseQuestion(characters)
  const alignments = new Map<string, Alignment>()

  function alignFrom(tokenIndex: number, answerIndex: number): Alignment {
    const key = `${tokenIndex},${answerIndex}`
    const known = alignments.get(key)
    if (known) return known

    const options: Alignment[] = []
    const token = tokens[tokenIndex]
    const isAnswerLeft = answerIndex < answerKana.length

    if (!token) {
      const extra = answerKana.slice(answerIndex).map((_, offset) => answerIndex + offset)
      options.push({ cost: extra.length, mismatchedIndexes: extra })
    } else if (token.kind === 'kana') {
      if (isAnswerLeft) {
        const isMatch = answerKana[answerIndex] === token.kana
        options.push(addMismatch(alignFrom(tokenIndex + 1, answerIndex + 1), isMatch ? null : answerIndex))
      }
      options.push(addCost(alignFrom(tokenIndex + 1, answerIndex)))
    } else {
      for (let end = answerIndex + 1; end <= answerKana.length; end++) {
        options.push(alignFrom(tokenIndex + 1, end))
      }
      options.push(addCost(alignFrom(tokenIndex + 1, answerIndex)))
    }

    if (token && isAnswerLeft) options.push(addMismatch(alignFrom(tokenIndex, answerIndex + 1), answerIndex))

    const best = options.reduce((cheapest, option) => (option.cost < cheapest.cost ? option : cheapest))
    alignments.set(key, best)
    return best
  }

  return alignFrom(0, 0).mismatchedIndexes
}

function tokeniseQuestion(characters: string): Token[] {
  const tokens: Token[] = []
  for (const character of removeIgnoredCharacters(characters)) {
    if (!isKanji(character)) tokens.push({ kind: 'kana', kana: toHiragana(character) })
    else if (tokens.at(-1)?.kind !== 'kanji') tokens.push({ kind: 'kanji' })
  }
  return tokens
}

function addMismatch(alignment: Alignment, index: number | null): Alignment {
  if (index === null) return alignment
  return { cost: alignment.cost + 1, mismatchedIndexes: [index, ...alignment.mismatchedIndexes] }
}

function addCost(alignment: Alignment): Alignment {
  return { ...alignment, cost: alignment.cost + 1 }
}
