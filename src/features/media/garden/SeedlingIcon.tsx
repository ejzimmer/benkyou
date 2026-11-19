type SeedlingIconProps = { width?: string };

export function SeedlingIcon({ width }: SeedlingIconProps) {
  return (
    <svg viewBox="0 0 48 48" width={width} aria-hidden="true">
      <path
        d="M24 40 L24 22"
        stroke="hsl(105 38% 30%)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <g
        fill="hsl(98 48% 48%)"
        stroke="hsl(105 45% 28%)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      >
        <path d="M24 26 C16 26 10 20 9 12 C17 12 23 17 24 26 Z" />
        <path d="M24 22 C25 14 31 9 39 9 C38 17 32 22 24 22 Z" />
      </g>
      <path
        d="M6 46 Q24 33 42 46 Z"
        fill="hsl(28 42% 48%)"
        stroke="hsl(28 45% 28%)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
