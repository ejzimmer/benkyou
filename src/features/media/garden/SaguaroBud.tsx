type SaguaroBudProps = { x: number; y: number };

export function SaguaroBud({ x, y }: SaguaroBudProps) {
  return (
    <g className="saguaro-bud" data-testid="saguaro-bud">
      <ellipse cx={x} cy={y} rx={2.2} ry={2.6} />
      <path d={`M${x - 1.3} ${y - 1.6} q1.3 -1.2 2.6 0`} />
    </g>
  );
}
