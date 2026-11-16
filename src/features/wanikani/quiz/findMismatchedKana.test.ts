import { describe, expect, it } from 'vitest'
import { findMismatchedKana } from './findMismatchedKana'

describe('findMismatchedKana', () => {
  it('finds changed kana after the kanji', () => {
    expect(findMismatchedKana('たべれ', '食べる')).toEqual([2])
    expect(findMismatchedKana('たへれ', '食べる')).toEqual([1, 2])
  })

  it('finds changed kana before the kanji', () => {
    expect(findMismatchedKana('あちゃ', 'お茶')).toEqual([0])
  })

  it('finds changed kana between kanji', () => {
    expect(findMismatchedKana('とるけす', '取り消す')).toEqual([1])
  })

  it('finds extra kana', () => {
    expect(findMismatchedKana('たべるる', '食べる')).toEqual([3])
  })

  it('compares katakana and romaji as hiragana', () => {
    expect(findMismatchedKana('タベレ', '食べる')).toEqual([2])
    expect(findMismatchedKana('たべn', '食べる')).toEqual([2])
  })

  it('finds nothing in an answer that keeps the kana', () => {
    expect(findMismatchedKana('たべる', '食べる')).toEqual([])
  })

  it('finds nothing to mark when kana are only missing', () => {
    expect(findMismatchedKana('たべ', '食べる')).toEqual([])
  })

  it('ignores the 〜 in the question', () => {
    expect(findMismatchedKana('わが', '我が〜')).toEqual([])
    expect(findMismatchedKana('わの', '我が〜')).toEqual([1])
  })
})
