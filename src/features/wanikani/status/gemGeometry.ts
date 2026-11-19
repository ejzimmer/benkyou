import { SubjectType } from './types';

type Point = [number, number];

const SQRT3 = Math.sqrt(3);
const HEX_VERTEX_ANGLES = [-90, -30, 30, 90, 150, 210];
const GEM_TO_SETTING_RATIO = 0.84;
const TABLE_FACET_RATIO = 0.5;

export function getHexVertices(cx: number, cy: number, r: number): Point[] {
  return HEX_VERTEX_ANGLES.map((degrees) => {
    const radians = (degrees * Math.PI) / 180;
    return [cx + r * Math.cos(radians), cy + r * Math.sin(radians)];
  });
}

export function formatPoints(points: Point[]) {
  return points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
}

export function clipVerticesBelow(vertices: Point[], y0: number): Point[] {
  return vertices.flatMap((a, index) => {
    const b = vertices[(index + 1) % vertices.length];
    const isAInside = a[1] >= y0;
    const isBInside = b[1] >= y0;
    const kept: Point[] = isAInside ? [a] : [];
    if (isAInside !== isBInside) {
      const t = (y0 - a[1]) / (b[1] - a[1]);
      kept.push([a[0] + t * (b[0] - a[0]), y0]);
    }
    return kept;
  });
}

function drawSparkle(cx: number, cy: number, size: number) {
  return [
    `M${cx},${cy - size}`,
    `Q${cx},${cy} ${cx + size},${cy}`,
    `Q${cx},${cy} ${cx},${cy + size}`,
    `Q${cx},${cy} ${cx - size},${cy}`,
    `Q${cx},${cy} ${cx},${cy - size}Z`,
  ].join('');
}

export function calculateGemShape(
  cx: number,
  cy: number,
  r: number,
  percent: number,
) {
  const outer = getHexVertices(cx, cy, r);
  const inner = getHexVertices(cx, cy, r * TABLE_FACET_RATIO);
  const isFull = percent >= 100;
  const isEmpty = percent <= 0;
  const surfaceY = cy + r - (percent / 100) * 2 * r;
  const filled = isEmpty
    ? []
    : isFull
      ? outer
      : clipVerticesBelow(outer, surfaceY);
  const surface = filled.filter(([, y]) => y === surfaceY);

  return {
    isFull,
    isEmpty,
    outline: formatPoints(outer),
    fill: formatPoints(filled),
    surface: isFull || isEmpty ? '' : formatPoints(surface),
    facets:
      outer
        .map((vertex, index) => `M${formatPoints([vertex, inner[index]])}`)
        .join('') + `M${formatPoints(inner).split(' ').join('L')}Z`,
    highlight: formatPoints([outer[5], outer[0], inner[0], inner[5]]),
    sparkle: drawSparkle(cx + r * 0.42, cy - r * 0.5, r * 0.34),
  };
}

export function calculateClusterLayout(r: number) {
  const padding = 1;
  const width = 2 * SQRT3 * r + 2 * padding;
  const height = 3.5 * r + 2 * padding;
  const centres: Record<SubjectType, Point> = {
    radical: [SQRT3 * r, r],
    kanji: [(SQRT3 * r) / 2, 2.5 * r],
    vocabulary: [1.5 * SQRT3 * r, 2.5 * r],
  };

  return {
    width,
    height,
    viewBox: [-padding, -padding, width, height]
      .map((n) => n.toFixed(2))
      .join(' '),
    centres,
    label: { x: (SQRT3 * r) / 2 - 1.5, y: r },
    settingRadius: r,
    gemRadius: r * GEM_TO_SETTING_RATIO,
  };
}
