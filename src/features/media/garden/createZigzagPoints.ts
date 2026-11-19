import { Point } from './treeGeometry';

type Zigzag = {
  start: Point;
  left: number;
  right: number;
  firstRowY: number;
  rowGap: number;
  length: number;
};

const STEP = 1;
const WOBBLE = 2.2;
const WOBBLE_WAVELENGTH = 11;

export function createZigzagPoints({
  start,
  left,
  right,
  firstRowY,
  rowGap,
  length,
}: Zigzag) {
  const radius = rowGap / 2;
  const rowStart = left + radius;
  const rowEnd = right - radius;
  const points: Point[] = [start];
  let total = 0;
  const addPoint = (x: number, y: number) => {
    const last = points[points.length - 1];
    total += Math.hypot(x - last.x, y - last.y);
    points.push({ x, y });
  };

  for (let t = 1; t <= 12; t++) {
    const eased = Math.sin(((t / 12) * Math.PI) / 2);
    addPoint(
      start.x + (rowStart - start.x) * (t / 12),
      start.y + (firstRowY - start.y) * eased,
    );
  }

  let y = firstRowY;
  let rows = 1;
  let goingRight = true;
  while (total < length) {
    const direction = goingRight ? 1 : -1;
    const from = goingRight ? rowStart : rowEnd;
    for (let x = from; (x - from) * direction <= rowEnd - rowStart;) {
      addPoint(x, y + Math.sin(x / WOBBLE_WAVELENGTH) * WOBBLE);
      x += STEP * direction;
    }
    if (total >= length) break;
    const centre = goingRight ? rowEnd : rowStart;
    for (let degrees = -90; degrees <= 90; degrees += 4) {
      const angle = (degrees * Math.PI) / 180;
      addPoint(
        centre + Math.cos(angle) * radius * direction,
        y + radius + Math.sin(angle) * radius,
      );
    }
    y += rowGap;
    rows += 1;
    goingRight = !goingRight;
  }

  return { points: trimToLength(points, length), rows };
}

function trimToLength(points: Point[], length: number) {
  const trimmed = [points[0]];
  let total = 0;
  for (const point of points.slice(1)) {
    const last = trimmed[trimmed.length - 1];
    total += Math.hypot(point.x - last.x, point.y - last.y);
    trimmed.push(point);
    if (total >= length) break;
  }
  return trimmed;
}
