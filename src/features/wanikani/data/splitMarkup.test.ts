import { describe, expect, it } from 'vitest'
import { splitMarkup } from './splitMarkup'

const describeParts = (text: string) => splitMarkup(text).map(({ text: part, tag }) => [part, tag])

describe('splitMarkup', () => {
  it('splits tagged words out of the text', () => {
    expect(describeParts('A <radical>ground</radical> under the <kanji>sun</kanji>.')).toEqual([
      ['A ', null],
      ['ground', 'radical'],
      [' under the ', null],
      ['sun', 'kanji'],
      ['.', null],
    ])
  })

  it('drops tags it doesn’t know', () => {
    expect(describeParts('A <b>bold</b> idea')).toEqual([['A bold idea', null]])
  })
})
