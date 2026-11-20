import { describe, expect, it } from 'vitest'
import { findNonKana } from './findNonKana'

describe('findNonKana', () => {
  it('finds letters that didn’t become kana', () => {
    expect(findNonKana('たbbべ')).toEqual([1, 2])
  })

  it('accepts a trailing n that will become ん', () => {
    expect(findNonKana('ほn')).toEqual([])
  })
})
