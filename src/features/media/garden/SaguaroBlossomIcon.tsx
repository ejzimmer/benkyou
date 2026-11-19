const PETALS = 9;

type SaguaroBlossomIconProps = { width?: string };

export function SaguaroBlossomIcon({ width }: SaguaroBlossomIconProps) {
  return (
    <svg viewBox="-8 -8 16 16" width={width} aria-hidden="true">
      {Array.from({ length: PETALS }, (_, petal) => (
        <ellipse
          key={petal}
          cy={-3.4}
          rx={2}
          ry={3.4}
          transform={`rotate(${(petal * 360) / PETALS})`}
          fill="hsl(50 60% 97%)"
          stroke="hsl(40 22% 60%)"
          strokeWidth="0.5"
        />
      ))}
      <circle
        r={2.2}
        fill="hsl(48 92% 58%)"
        stroke="hsl(40 70% 42%)"
        strokeWidth="0.5"
      />
    </svg>
  );
}
