export interface Crystal {
  angle: number
  height: number
  width: number
  offset: number
}

const MAX_CRYSTALS = 7
const TALLEST_CRYSTAL = 40
const FAN_DEGREES = 80

export function buildCrystalCluster(seed: number, count: number, busiestCount: number): Crystal[] {
  const random = createSeededRandom(seed)
  const crystalCount = Math.min(MAX_CRYSTALS, Math.max(1, Math.round(1 + Math.sqrt(count) * 1.2)))
  const tallest = TALLEST_CRYSTAL * (0.3 + 0.7 * Math.sqrt(count / busiestCount))

  return Array.from({ length: crystalCount }, (_, index) => {
    const fanAngle = crystalCount === 1 ? 0 : (index / (crystalCount - 1) - 0.5) * FAN_DEGREES
    const centreness = 1 - Math.abs(fanAngle) / (FAN_DEGREES * 0.625)
    const height = tallest * (0.45 + 0.55 * centreness) * (0.8 + random() * 0.3)
    return {
      angle: fanAngle + (random() - 0.5) * 14,
      height,
      width: Math.max(3.5, height * 0.42),
      offset: (random() - 0.5) * 4,
    }
  }).toSorted((first, second) => first.height - second.height)
}

function createSeededRandom(seed: number) {
  let state = Math.abs(Math.floor(seed)) % 2147483647 || 1
  return () => {
    state = (state * 16807) % 2147483647
    return state / 2147483647
  }
}
