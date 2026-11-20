import { Lattice } from './Lattice';
import {
  BEAM_HEIGHT,
  Pergola as PergolaFrame,
  RAFTER_HEIGHT,
} from './vineLayout';

const POST_WIDTH = 10;
const RAFTER_WIDTH = 9;
const RAFTER_SPACING = 41;

type PergolaProps = { pergola: PergolaFrame };

export function Pergola({ pergola }: PergolaProps) {
  const { posts, beamTop, beamBottom, left, right } = pergola;
  const rafters = [];
  for (let x = left + 12; x < right - RAFTER_WIDTH; x += RAFTER_SPACING) {
    rafters.push(x);
  }

  return (
    <g className="pergola">
      {posts.slice(1).map((post, bay) => (
        <Lattice
          key={post}
          x={posts[bay] + POST_WIDTH / 2}
          y={beamBottom}
          width={post - posts[bay] - POST_WIDTH}
          height={-beamBottom}
        />
      ))}
      {posts.map((post) => (
        <rect
          key={post}
          className="pergola-wood"
          x={post - POST_WIDTH / 2}
          y={beamBottom - 1}
          width={POST_WIDTH}
          height={1 - beamBottom}
        />
      ))}
      <rect
        className="pergola-wood"
        x={left}
        y={beamTop}
        width={right - left}
        height={BEAM_HEIGHT}
        rx="1.5"
      />
      {rafters.map((x) => (
        <rect
          key={x}
          className="pergola-wood"
          x={x}
          y={beamTop - RAFTER_HEIGHT}
          width={RAFTER_WIDTH}
          height={RAFTER_HEIGHT}
          rx="1"
        />
      ))}
    </g>
  );
}
