const PETALS = 9;

type SaguaroBlossomProps = { x: number; y: number };

export function SaguaroBlossom({ x, y }: SaguaroBlossomProps) {
  return (
    <g className="saguaro-blossom" data-testid="saguaro-blossom">
      <path className="saguaro-stalk" d={`M${x} ${y + 2} L${x} ${y - 1}`} />
      <g transform={`translate(${x} ${y - 2.5})`}>
        {Array.from({ length: PETALS }, (_, petal) => (
          <ellipse
            key={petal}
            className="saguaro-petal"
            cy={-1.9}
            rx={1.1}
            ry={1.9}
            transform={`rotate(${(petal * 360) / PETALS})`}
          />
        ))}
        <circle className="saguaro-centre" r={1.2} />
      </g>
    </g>
  );
}
