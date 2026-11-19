import { calculateBloomFraction } from './calculateBloomFraction';
import { EdgeSample } from './treeGeometry';
import { findBranchPoint } from './findBranchPoint';
import { toRadians } from '../../../journal/toRadians';

const BUD_ROWS = 8;
const SPAN = 22;
const TIP_GAP = 4;
const BUD_RADIUS = 1.3;
const BUD_GAP = 1.2;
const STAMEN_LENGTH = 7.5;
const FRONT_STAMEN_LENGTH = 3;
const FANS = [-70, -45, -22, 0, 22, 45, 70];
const ANTHER_FANS = [-22, 0, 22];
const FRONT_STAMENS = [-1, 0, 1];
const CLOSED_BUD = [92, 42, 46];
const OPEN_BUD = [54, 72, 62];

const clampFraction = (value: number) => Math.min(1, Math.max(0, value));

const mixColour = (amount: number) => {
  const [hue, saturation, lightness] = CLOSED_BUD.map(
    (value, index) => value + (OPEN_BUD[index] - value) * amount,
  );
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
};

type BottlebrushProps = {
  edges: EdgeSample[];
  length: number;
  endAt: number;
  understood: number;
};

export function Bottlebrush({
  edges,
  length,
  endAt,
  understood,
}: BottlebrushProps) {
  const lastRowAt = endAt - TIP_GAP / length;
  const firstRowAt = Math.max(0.02, lastRowAt - SPAN / length);
  const opened = calculateBloomFraction(understood);

  const rows = Array.from({ length: BUD_ROWS }, (_, row) => {
    const point = findBranchPoint(
      edges,
      firstRowAt + ((lastRowAt - firstRowAt) * row) / (BUD_ROWS - 1),
    );
    const sprout = clampFraction((opened * (BUD_ROWS + 2) - row) / 3);
    const taper = 0.75 + 0.25 * Math.sin((Math.PI * (row + 0.5)) / BUD_ROWS);
    const buds = [-1, 1].map((side) => {
      const normal = point.angle + 90 * side;
      const reach = point.width / 2 + BUD_GAP;
      const x = point.x + Math.cos(toRadians(normal)) * reach;
      const y = point.y + Math.sin(toRadians(normal)) * reach;
      const stamens = FANS.map((fan) => {
        const direction = toRadians(normal + fan * side);
        const stamenLength = sprout * STAMEN_LENGTH * taper;
        return {
          fan,
          tipX: x + Math.cos(direction) * stamenLength,
          tipY: y + Math.sin(direction) * stamenLength,
        };
      });
      return { side, x, y, stamens };
    });
    const front = FRONT_STAMENS.map((offset) => {
      const across = toRadians(point.angle + 90);
      const x = point.x + Math.cos(across) * offset * point.width * 0.3;
      const y = point.y + Math.sin(across) * offset * point.width * 0.3;
      const direction = toRadians(point.angle + 90 + offset * 25);
      return {
        offset,
        x,
        y,
        tipX: x + Math.cos(direction) * sprout * FRONT_STAMEN_LENGTH,
        tipY: y + Math.sin(direction) * sprout * FRONT_STAMEN_LENGTH,
      };
    });
    return { row, sprout, buds, front };
  });

  const sprouted = rows.filter(({ sprout }) => sprout > 0);

  return (
    <g className="bottlebrush">
      <g className="bottlebrush-buds">
        {rows.flatMap(({ row, sprout, buds }) =>
          buds.map(({ side, x, y }) => (
            <circle
              key={`${row}${side}`}
              cx={x}
              cy={y}
              r={BUD_RADIUS}
              fill={mixColour(sprout)}
            />
          )),
        )}
      </g>
      <g className="bottlebrush-stamens">
        {sprouted.flatMap(({ row, buds, front }) => [
          ...buds.flatMap(({ side, x, y, stamens }) =>
            stamens.map(({ fan, tipX, tipY }) => (
              <line
                key={`${row}${side}${fan}`}
                x1={x}
                y1={y}
                x2={tipX}
                y2={tipY}
              />
            )),
          ),
          ...front.map(({ offset, x, y, tipX, tipY }) => (
            <line
              key={`${row}front${offset}`}
              x1={x}
              y1={y}
              x2={tipX}
              y2={tipY}
            />
          )),
        ])}
      </g>
      <g className="bottlebrush-anthers">
        {sprouted.flatMap(({ row, sprout, buds, front }) => [
          ...(sprout > 0.4
            ? buds.flatMap(({ side, stamens }) =>
                stamens
                  .filter(({ fan }) => ANTHER_FANS.includes(fan))
                  .map(({ fan, tipX, tipY }) => (
                    <circle
                      key={`${row}${side}${fan}`}
                      cx={tipX}
                      cy={tipY}
                      r={0.45 * sprout}
                    />
                  )),
              )
            : []),
          ...front.map(({ offset, tipX, tipY }) => (
            <circle
              key={`${row}front${offset}`}
              cx={tipX}
              cy={tipY}
              r={0.4 * sprout}
            />
          )),
        ])}
      </g>
    </g>
  );
}
