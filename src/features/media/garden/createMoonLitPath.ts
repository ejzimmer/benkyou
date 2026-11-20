export function createMoonLitPath(phase: number, radius: number) {
  const waxingPhase = phase <= 0.5 ? phase : 1 - phase;
  const terminatorRadius =
    Math.abs(Math.cos(2 * Math.PI * waxingPhase)) * radius;
  const bulgesLeft = waxingPhase > 0.25 ? 1 : 0;
  return `M0 ${-radius}A${radius} ${radius} 0 0 1 0 ${radius}A${terminatorRadius} ${radius} 0 0 ${bulgesLeft} 0 ${-radius}Z`;
}
