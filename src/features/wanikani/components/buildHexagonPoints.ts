export function buildHexagonPoints(radius: number) {
  return Array.from({ length: 6 }, (_, corner) => {
    const angle = (Math.PI / 3) * corner - Math.PI / 2
    return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) }
  })
}

export function formatPolygonPoints(points: { x: number; y: number }[]) {
  return points.map(({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
}
