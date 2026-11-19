import { SRS_GROUPS, SrsGroup } from './types';

const LIQUID_ORDER = [...SRS_GROUPS].reverse();

export function drawTube(
  left: number,
  right: number,
  top: number,
  bottom: number,
) {
  const radius = (right - left) / 2;
  return [
    `M${left},${top}`,
    `L${left},${bottom - radius}`,
    `A${radius},${radius} 0 0 0 ${right},${bottom - radius}`,
    `L${right},${top}Z`,
  ].join('');
}

export function calculateLiquidLayers(
  counts: Record<SrsGroup, number>,
  total: number,
  top: number,
  bottom: number,
) {
  const span = bottom - top;
  let surfaceY = bottom;
  const layers = LIQUID_ORDER.map((group) => {
    const height = total ? (counts[group] / total) * span : 0;
    surfaceY -= height;
    return { group, y: surfaceY, height };
  });

  return { layers, surfaceY };
}

function createRandomNumberGenerator(seed: number) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return value / 2147483647;
  };
}

type BubbleBounds = {
  left: number;
  right: number;
  bottom: number;
  surfaceY: number;
};

export function createBubbles(
  count: number,
  seed: number,
  { left, right, bottom, surfaceY }: BubbleBounds,
) {
  const random = createRandomNumberGenerator(seed);

  return Array.from({ length: count }, () => {
    const duration = 6 + random() * 7;
    return {
      x: left + random() * (right - left),
      y: bottom,
      r: 1 + random() * 1.8,
      rise: surfaceY - bottom,
      drift: 1 + random() * 2,
      duration,
      delay: -random() * duration,
    };
  });
}
