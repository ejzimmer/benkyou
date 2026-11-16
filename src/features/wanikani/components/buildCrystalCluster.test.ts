import { describe, expect, it } from 'vitest'
import { buildCrystalCluster } from './buildCrystalCluster'

function findTallestCrystal(count: number) {
  return Math.max(...buildCrystalCluster(7, count, 20).map((crystal) => crystal.height))
}

describe('buildCrystalCluster', () => {
  describe('for the same seed', () => {
    it('grows the same cluster every time', () => {
      expect(buildCrystalCluster(42, 9, 20)).toEqual(buildCrystalCluster(42, 9, 20))
    })
  })

  describe('as the count grows', () => {
    it('adds more crystals, up to seven', () => {
      const counts = [1, 4, 9, 400].map((count) => buildCrystalCluster(7, count, 400).length)
      expect(counts).toEqual([2, 3, 5, 7])
    })

    it('grows taller crystals', () => {
      expect(findTallestCrystal(20)).toBeGreaterThan(findTallestCrystal(2))
    })
  })

  describe('when drawn back to front', () => {
    it('orders the crystals from shortest to tallest', () => {
      const heights = buildCrystalCluster(3, 16, 20).map((crystal) => crystal.height)
      expect(heights).toEqual(heights.toSorted((first, second) => first - second))
    })
  })
})
