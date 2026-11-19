import { calculateBloomFraction } from './calculateBloomFraction';
import { SakuraBlossom } from './SakuraBlossom';
import { toRadians } from '../shared/toRadians';

const BLOSSOM_COUNT = 5;
const OPENING_ORDER = [2, 0, 4, 1, 3];
const FAN = 34;
const BLOOM_EXPONENT = 6;

const clampFraction = (value: number) => Math.min(1, Math.max(0, value));

type SakuraClusterProps = {
  x: number;
  y: number;
  angle: number;
  understood: number;
  size: number;
};

export function SakuraCluster({
  x,
  y,
  angle,
  understood,
  size,
}: SakuraClusterProps) {
  const blossoms = OPENING_ORDER.map((order, index) => {
    const facing = angle + (index - (BLOSSOM_COUNT - 1) / 2) * FAN;
    const reach = (6 + (index % 2) * 3) * size;
    const direction = toRadians(facing);
    return {
      index,
      facing,
      tipX: x + Math.cos(direction) * reach,
      tipY: y + Math.sin(direction) * reach,
      bendX: x + Math.cos(direction) * reach * 0.5 + 1,
      bendY: y + Math.sin(direction) * reach * 0.5 - 1,
      openness: clampFraction(
        calculateBloomFraction(understood, BLOOM_EXPONENT) * BLOSSOM_COUNT -
          order,
      ),
    };
  });

  return (
    <g className="sakura-cluster">
      <g className="sakura-stalks" strokeWidth={0.9 * size}>
        {blossoms.map(({ index, tipX, tipY, bendX, bendY }) => (
          <path
            key={index}
            d={`M${x} ${y} Q${bendX} ${bendY} ${tipX} ${tipY}`}
          />
        ))}
      </g>
      {blossoms.map(({ index, tipX, tipY, facing, openness }) => (
        <SakuraBlossom
          key={index}
          x={tipX}
          y={tipY}
          facing={facing}
          openness={openness}
          size={size}
        />
      ))}
    </g>
  );
}
