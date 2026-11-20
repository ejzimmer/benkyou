import { describe, expect, it } from 'vitest'
import { buildSakuraTree } from './buildSakuraTree'
import { countBlossoms } from './countBlossoms'

describe('buildSakuraTree', () => {
  it('grows the same tree every time, so each level adds to the last', () => {
    expect(buildSakuraTree()).toEqual(buildSakuraTree())
  })
})

describe('countBlossoms', () => {
  it('blooms the share of the tree matching the share of levels reached', () => {
    expect(countBlossoms(15, 200)).toBe(50)
    expect(countBlossoms(60, 200)).toBe(200)
  })

  it('never blooms more than the whole tree', () => {
    expect(countBlossoms(61, 200)).toBe(200)
  })
})
