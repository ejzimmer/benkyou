const PETAL =
  'M0 0 C-6.5 -3.5 -8 -11 -3.6 -14.4 L0 -12 L3.6 -14.4 C8 -11 6.5 -3.5 0 0 Z';
const PETAL_ANGLES = [0, 72, 144, 216, 288];
const STAMEN_TIPS = Array.from({ length: 10 }, (_, index) => {
  const angle = ((index * 36 + 18) * Math.PI) / 180;
  return [Math.cos(angle) * 5, Math.sin(angle) * 5];
});

type SakuraFlowerIconProps = { width?: string };

export function SakuraFlowerIcon({ width }: SakuraFlowerIconProps) {
  return (
    <svg viewBox="-16 -16 32 32" width={width} aria-hidden="true">
      <g
        fill="hsl(345 85% 88%)"
        stroke="hsl(342 55% 62%)"
        strokeLinejoin="round"
      >
        {PETAL_ANGLES.map((angle) => (
          <path key={angle} d={PETAL} transform={`rotate(${angle})`} />
        ))}
      </g>
      <circle r="3" fill="hsl(340 70% 72%)" />
      <g stroke="hsl(340 55% 55%)" strokeWidth="0.7">
        {STAMEN_TIPS.map(([x, y]) => (
          <line key={`${x},${y}`} x1="0" y1="0" x2={x} y2={y} />
        ))}
      </g>
      <g fill="hsl(45 90% 55%)">
        {STAMEN_TIPS.map(([x, y]) => (
          <circle key={`${x},${y}`} cx={x} cy={y} r="0.9" />
        ))}
      </g>
    </svg>
  );
}
