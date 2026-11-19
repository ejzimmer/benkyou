import { Pergola } from './vineLayout';

const HALF_WIDTH = 5;
const GAP = 3;

type PostFrontsProps = { pergola: Pergola };

export function PostFronts({ pergola }: PostFrontsProps) {
  return (
    <g className="post-fronts">
      {pergola.trunkCrossings.map(([top, bottom]) => {
        const from = top + GAP;
        const to = bottom - GAP;
        if (to - from < 4) return null;
        return (
          <g key={top}>
            <rect
              x={-HALF_WIDTH}
              y={from}
              width={HALF_WIDTH * 2}
              height={to - from}
            />
            <path
              d={`M${-HALF_WIDTH} ${from} V${to} M${HALF_WIDTH} ${from} V${to}`}
            />
          </g>
        );
      })}
    </g>
  );
}
