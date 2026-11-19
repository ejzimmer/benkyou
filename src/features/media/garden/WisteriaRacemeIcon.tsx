const FLORETS: [x: number, y: number, size: number][] = [
  [-4.6, -5.4, 1],
  [0, -6, 1],
  [4.6, -5.4, 1],
  [-3.4, -1.6, 0.9],
  [1.2, -1.9, 0.9],
  [4.4, -0.9, 0.85],
  [-1.8, 2, 0.8],
  [2.6, 2.4, 0.75],
  [0.2, 5.4, 0.65],
  [-0.6, 8.2, 0.5],
];

type WisteriaRacemeIconProps = { width?: string };

export function WisteriaRacemeIcon({ width }: WisteriaRacemeIconProps) {
  return (
    <svg viewBox="-8 -9 16 19" width={width} aria-hidden="true">
      <path
        d="M0 -8.5 Q0.6 0 -0.6 9"
        fill="none"
        stroke="hsl(95 30% 34%)"
        strokeWidth="0.7"
      />
      {FLORETS.map(([x, y, size]) => (
        <g key={`${x},${y}`} transform={`translate(${x} ${y}) scale(${size})`}>
          <path
            d="M-3 -0.4 C-3.2 -3.6 3.2 -3.6 3 -0.4 Q0 1 -3 -0.4 Z"
            fill="hsl(268 58% 72%)"
            stroke="hsl(270 40% 42%)"
            strokeWidth="0.5"
          />
          <path
            d="M-1.8 0 C-1.8 2.5 1.8 2.5 1.8 0 Q0 -0.7 -1.8 0 Z"
            fill="hsl(272 55% 56%)"
            stroke="hsl(272 40% 36%)"
            strokeWidth="0.45"
          />
        </g>
      ))}
    </svg>
  );
}
