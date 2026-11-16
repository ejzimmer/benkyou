import { buildHexagonPoints, formatPolygonPoints } from './buildHexagonPoints'

const OUTER_RADIUS = 50
const TABLE_RADIUS = 30

interface Props {
  gemType: 'radical' | 'kanji' | 'vocab' | 'empty'
  label: string | number
}

export function HexagonGem({ gemType, label }: Props) {
  const outer = buildHexagonPoints(OUTER_RADIUS)
  const table = buildHexagonPoints(TABLE_RADIUS)
  const isEmpty = gemType === 'empty'

  return (
    <svg className="hexagon-gem" width="104" height="112" viewBox="-52 -56 104 112" aria-hidden="true">
      <polygon
        points={formatPolygonPoints(outer)}
        fill={isEmpty ? 'var(--night)' : `url(#gem-${gemType})`}
        filter={isEmpty ? undefined : `url(#gem-glow-${gemType})`}
      />
      <polygon points={formatPolygonPoints(table)} fill="none" stroke="white" strokeOpacity={0.45} strokeWidth={1.2} />
      {table.map((corner, index) => (
        <line key={`${corner.x},${corner.y}`} x1={corner.x} y1={corner.y} x2={outer[index].x} y2={outer[index].y} stroke="white" strokeOpacity={0.35} />
      ))}
      <text y="10" textAnchor="middle">
        {label}
      </text>
    </svg>
  )
}
