type Point = [number, number];

export function calculateRingDash(r: number, fraction: number) {
  const circumference = 2 * Math.PI * r;
  return `${fraction * circumference} ${circumference}`;
}

export function findPointOnRing(
  cx: number,
  cy: number,
  r: number,
  fraction: number,
): Point {
  const radians = (fraction * 360 - 90) * (Math.PI / 180);
  return [cx + r * Math.cos(radians), cy + r * Math.sin(radians)];
}

export function drawStar(cx: number, cy: number, outer: number) {
  const inner = outer * 0.45;
  const points = Array.from({ length: 10 }, (_, index) => {
    const [x, y] = findPointOnRing(
      cx,
      cy,
      index % 2 === 0 ? outer : inner,
      index / 10,
    );
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  return `M${points.join('L')}Z`;
}
