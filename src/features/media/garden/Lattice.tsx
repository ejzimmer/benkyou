import { useId } from 'react';

const SPACING = 16;

type LatticeProps = { x: number; y: number; width: number; height: number };

export function Lattice({ x, y, width, height }: LatticeProps) {
  const clipId = useId();
  const slats = [];
  for (let offset = -height; offset < width; offset += SPACING) {
    slats.push(
      `M${x + offset} ${y} l${height} ${height}`,
      `M${x + offset + height} ${y} l${-height} ${height}`,
    );
  }

  return (
    <>
      <clipPath id={clipId}>
        <rect x={x} y={y} width={width} height={height} />
      </clipPath>
      <path
        className="lattice"
        clipPath={`url(#${clipId})`}
        d={slats.join(' ')}
      />
    </>
  );
}
