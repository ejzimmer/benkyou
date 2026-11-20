import { placeAreoles, traceRibs } from './cactusRibs';
import { GrownShape } from './treeGrowth';

const formatLine = (points: { x: number; y: number }[]) =>
  `M${points.map(({ x, y }) => `${x} ${y}`).join(' L')}`;

type CactusRibsProps = { shapes: GrownShape[] };

export function CactusRibs({ shapes }: CactusRibsProps) {
  const ribs = shapes.flatMap(traceRibs).filter((rib) => rib.length > 1);

  return (
    <g className="cactus-ribs">
      {ribs.map((rib, index) => (
        <path key={index} d={formatLine(rib)} />
      ))}
      <g className="cactus-areoles">
        {ribs.flatMap(placeAreoles).map(({ x, y }, index) => (
          <circle key={index} cx={x} cy={y} r={0.9} />
        ))}
      </g>
    </g>
  );
}
