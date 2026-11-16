import './HanabiScene.css'
import { TREE_HEIGHT, TREE_WIDTH } from './buildSakuraTree'
import { FallingPetals } from './FallingPetals'
import { Fireworks } from './Fireworks'
import { SakuraTree } from './SakuraTree'
import { Stars } from './Stars'

const VIEW_BOX = `0 0 ${TREE_WIDTH} ${TREE_HEIGHT}`

interface Props {
  level: number
}

export function HanabiScene({ level }: Props) {
  return (
    <div className="hanabi-scene" aria-hidden="true">
      <svg className="sky" viewBox={VIEW_BOX} preserveAspectRatio="xMidYMid slice">
        <Stars />
      </svg>
      <Fireworks />
      <svg className="garden" viewBox={VIEW_BOX}>
        <ellipse className="hill" cx={TREE_WIDTH / 2} cy={TREE_HEIGHT + 40} rx={TREE_WIDTH * 2} ry="90" />
        <SakuraTree level={level} />
        <text className="level" x={TREE_WIDTH / 2} y={TREE_HEIGHT * 0.73}>
          {level}
        </text>
      </svg>
      <FallingPetals />
    </div>
  )
}
