import { toRadians } from '../shared/toRadians';
export type Point = { x: number; y: number };

type Curve = [Point, Point, Point, Point];

export type EdgeSample = { at: number; left: Point; right: Point };

export const SAMPLES_PER_CURVE = 8;

export const roundCoordinate = (value: number) => Math.round(value * 10) / 10;

export function turnToward(angle: number, target: number, amount: number) {
  const difference = ((target - angle + 540) % 360) - 180;
  return angle + difference * amount;
}

const stepToward = (point: Point, angle: number, length: number) => ({
  x: point.x + Math.cos(toRadians(angle)) * length,
  y: point.y + Math.sin(toRadians(angle)) * length,
});

export function walkPath(
  start: Point,
  angle: number,
  length: number,
  segments: number,
  bend: (angle: number, index: number) => number,
  random: () => number,
) {
  const points = [start];
  let direction = angle;
  for (let index = 0; index < segments; index++) {
    const stepLength = (length / segments) * (0.8 + random() * 0.4);
    points.push(stepToward(points[points.length - 1], direction, stepLength));
    direction = bend(direction, index);
  }
  return points;
}

const findPointOnCurve = ([p0, p1, p2, p3]: Curve, t: number) => {
  const u = 1 - t;
  const weights = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return {
    x:
      weights[0] * p0.x +
      weights[1] * p1.x +
      weights[2] * p2.x +
      weights[3] * p3.x,
    y:
      weights[0] * p0.y +
      weights[1] * p1.y +
      weights[2] * p2.y +
      weights[3] * p3.y,
  };
};

const createSmoothCurve = (points: Point[], index: number): Curve => {
  const p0 = points[index - 1] ?? points[index];
  const p1 = points[index];
  const p2 = points[index + 1];
  const p3 = points[index + 2] ?? p2;
  return [
    p1,
    { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
    { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
    p2,
  ];
};

export function findPointAlong(points: Point[], fraction: number) {
  const position = fraction * (points.length - 1);
  const index = Math.min(points.length - 2, Math.floor(position));
  const t = position - index;
  const a = points[index];
  const b = points[index + 1];
  return {
    point: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
    angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
  };
}

const findTangentOnCurve = ([p0, p1, p2, p3]: Curve, t: number) => {
  const u = 1 - t;
  const weights = [
    -3 * u * u,
    3 * u * u - 6 * u * t,
    6 * u * t - 3 * t * t,
    3 * t * t,
  ];
  const x =
    weights[0] * p0.x +
    weights[1] * p1.x +
    weights[2] * p2.x +
    weights[3] * p3.x;
  const y =
    weights[0] * p0.y +
    weights[1] * p1.y +
    weights[2] * p2.y +
    weights[3] * p3.y;
  const length = Math.hypot(x, y);
  return { x: x / length, y: y / length };
};

const sampleSmoothPath = (points: Point[]) =>
  points.slice(1).flatMap((_, index) => {
    const curve = createSmoothCurve(points, index);
    return Array.from(
      { length: index === 0 ? SAMPLES_PER_CURVE + 1 : SAMPLES_PER_CURVE },
      (_, sample) => {
        const t = (index === 0 ? sample : sample + 1) / SAMPLES_PER_CURVE;
        return {
          point: findPointOnCurve(curve, t),
          tangent: findTangentOnCurve(curve, t),
        };
      },
    );
  });

const roundPoint = ({ x, y }: Point) => ({
  x: roundCoordinate(x),
  y: roundCoordinate(y),
});

export function traceEdges(
  points: Point[],
  measureWidth: (at: number, point: Point) => number,
): EdgeSample[] {
  const samples = sampleSmoothPath(points);
  const distances = samples.reduce<number[]>(
    (totals, { point }, index) => [
      ...totals,
      index === 0
        ? 0
        : totals[index - 1] +
          Math.hypot(
            point.x - samples[index - 1].point.x,
            point.y - samples[index - 1].point.y,
          ),
    ],
    [],
  );
  const total = distances[distances.length - 1];
  return samples.map(({ point, tangent }, index) => {
    const at = distances[index] / total;
    const halfWidth = measureWidth(at, point) / 2;
    return {
      at,
      left: roundPoint({
        x: point.x - tangent.y * halfWidth,
        y: point.y + tangent.x * halfWidth,
      }),
      right: roundPoint({
        x: point.x + tangent.y * halfWidth,
        y: point.y - tangent.x * halfWidth,
      }),
    };
  });
}

export const traceTaperedEdges = (
  points: Point[],
  [startWidth, endWidth]: [number, number],
) => traceEdges(points, (at) => startWidth + (endWidth - startWidth) * at);
