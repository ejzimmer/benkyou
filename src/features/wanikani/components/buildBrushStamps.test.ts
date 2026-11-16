import { describe, expect, it } from 'vitest'
import { getWidthFactor } from './buildBrushStamps'

describe('getWidthFactor', () => {
  it('presses heavier where the brush lands than along the body', () => {
    expect(getWidthFactor(0.04, 'stop')).toBeGreaterThan(getWidthFactor(0.5, 'stop'))
  })

  it('tapers a sweep to a fine point', () => {
    expect(getWidthFactor(1, 'sweep')).toBeLessThan(0.1)
  })

  it('swells a dot as the brush presses down', () => {
    expect(getWidthFactor(1, 'dot')).toBeGreaterThan(getWidthFactor(0, 'dot'))
  })
})
