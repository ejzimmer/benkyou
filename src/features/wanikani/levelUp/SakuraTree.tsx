import { buildSakuraTree } from './buildSakuraTree'
import { countBlossoms } from './countBlossoms'

const PETAL_ANGLES = [0, 72, 144, 216, 288]
const BLOOM_START_MS = 900
const BLOOM_STAGGER_MS = 60
const { branches, blossoms } = buildSakuraTree()

interface Props {
  level: number
}

export function SakuraTree({ level }: Props) {
  const bloomedBefore = countBlossoms(level - 1, blossoms.length)
  const bloomed = blossoms.slice(0, countBlossoms(level, blossoms.length))

  return (
    <g className="sakura-tree">
      <defs>
        <g id="sakura-blossom">
          {PETAL_ANGLES.map((angle) => (
            <ellipse key={angle} className="petal" cx="0" cy="-4.2" rx="3.2" ry="4.6" transform={`rotate(${angle})`} />
          ))}
          <circle className="centre" r="1.6" />
        </g>
      </defs>
      {branches.map((branch) => (
        <path key={branch.id} className="branch" d={branch.path} strokeWidth={branch.width} />
      ))}
      {bloomed.map((blossom) => (
        <g key={blossom.id} transform={`translate(${blossom.x} ${blossom.y}) rotate(${blossom.rotation}) scale(${blossom.scale})`}>
          <use
            href="#sakura-blossom"
            className={blossom.id < bloomedBefore ? 'blossom' : 'blossom new'}
            style={{ animationDelay: `${BLOOM_START_MS + (blossom.id - bloomedBefore) * BLOOM_STAGGER_MS}ms` }}
          />
        </g>
      ))}
    </g>
  )
}
