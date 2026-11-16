export type StrokeEnding = 'stop' | 'sweep' | 'dot'

export interface Point {
  x: number
  y: number
}

const PRESS_WEIGHT = 0.2
const SWEEP_START = 0.7

// One circle per point along the stroke, all wound the same way, so the nonzero fill joins them into one brush shape.
export function buildBrushStamps(points: readonly Point[], ending: StrokeEnding, brushWidth: number) {
  return points
    .map((point, i) => {
      const radius = (brushWidth / 2) * getWidthFactor(i / (points.length - 1), ending)
      return drawCircle(point, radius)
    })
    .join(' ')
}

export function getWidthFactor(progress: number, ending: StrokeEnding) {
  const press = 1 + PRESS_WEIGHT * Math.exp(-(((progress - 0.04) / 0.06) ** 2))
  switch (ending) {
    case 'stop':
      return 0.8 * press + 0.08 * Math.exp(-(((progress - 0.97) / 0.05) ** 2))
    case 'sweep':
      return 0.85 * press * (progress < SWEEP_START ? 1 : 1 - 0.92 * ((progress - SWEEP_START) / (1 - SWEEP_START)) ** 1.3)
    case 'dot':
      return 0.5 + 0.6 * progress ** 0.7
  }
}

function drawCircle({ x, y }: Point, radius: number) {
  const r = radius.toFixed(2)
  return `M${(x - radius).toFixed(2)},${y.toFixed(2)} a${r},${r} 0 1,0 ${(radius * 2).toFixed(2)},0 a${r},${r} 0 1,0 ${(-radius * 2).toFixed(2)},0`
}
