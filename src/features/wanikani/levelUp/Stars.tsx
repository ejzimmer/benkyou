import { TREE_HEIGHT, TREE_WIDTH } from './buildSakuraTree'
import { createRandom } from './createRandom'

const random = createRandom(7)
const STARS = Array.from({ length: 40 }, (_, id) => ({
  id,
  x: Math.round(random() * TREE_WIDTH),
  y: Math.round(random() * TREE_HEIGHT * 0.6),
  radius: Math.round((0.4 + random() * 0.9) * 10) / 10,
}))

export function Stars() {
  return (
    <g className="stars">
      {STARS.map((star) => (
        <circle key={star.id} className="star" cx={star.x} cy={star.y} r={star.radius} />
      ))}
    </g>
  )
}
