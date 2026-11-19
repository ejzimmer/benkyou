import { createMoonLitPath } from './createMoonLitPath';

type MoonProps = {
  phase: number;
  isSouthern: boolean;
};

const RADIUS = 20;

export function Moon({ phase, isSouthern }: MoonProps) {
  const isWaning = phase > 0.5;
  const isLitOnLeft = isWaning !== isSouthern;

  return (
    <svg
      className="moon"
      viewBox={`${-RADIUS} ${-RADIUS} ${RADIUS * 2} ${RADIUS * 2}`}
    >
      <circle className="moon-dark" r={RADIUS} />
      <path
        className="moon-lit"
        d={createMoonLitPath(phase, RADIUS)}
        transform={isLitOnLeft ? 'scale(-1 1)' : undefined}
      />
    </svg>
  );
}
