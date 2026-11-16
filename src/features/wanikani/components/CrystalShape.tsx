import type { Crystal } from './buildCrystalCluster'

interface Props {
  crystal: Crystal
}

export function CrystalShape({ crystal }: Props) {
  const halfWidth = crystal.width / 2
  const shoulder = crystal.height - crystal.width * 0.9
  return (
    <g transform={`translate(${crystal.offset} 2) rotate(${crystal.angle})`}>
      <polygon
        points={`${-halfWidth},0 ${-halfWidth},${-shoulder} 0,${-crystal.height} ${halfWidth},${-shoulder} ${halfWidth},0`}
        fill="url(#gem-radical)"
      />
      <polyline points={`0,0 0,${-shoulder} ${-halfWidth},${-shoulder}`} fill="none" stroke="white" strokeOpacity={0.45} strokeWidth={0.7} />
      <line x1={0} y1={-shoulder} x2={0} y2={-crystal.height} stroke="white" strokeOpacity={0.6} strokeWidth={0.7} />
    </g>
  )
}
