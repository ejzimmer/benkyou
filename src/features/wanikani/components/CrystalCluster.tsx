import { buildCrystalCluster } from './buildCrystalCluster'
import { CrystalShape } from './CrystalShape'

const SIZE = 60

interface Props {
  seed: number
  count: number
  busiestCount: number
}

export function CrystalCluster({ seed, count, busiestCount }: Props) {
  const crystals = buildCrystalCluster(seed, count, busiestCount)

  return (
    <svg width={SIZE} height={SIZE} viewBox={`${-SIZE / 2} ${-SIZE + 6} ${SIZE} ${SIZE}`} overflow="visible" aria-hidden="true">
      <g filter="url(#gem-glow-radical)">
        {crystals.map((crystal) => (
          <CrystalShape key={crystal.angle} crystal={crystal} />
        ))}
      </g>
      <ellipse cx={0} cy={2} rx={6 + crystals.length * 1.4} ry={2.2} fill="var(--radical-dark)" fillOpacity={0.35} />
    </svg>
  )
}

