import { ShapeGrowth, TreeLayout } from './treeLayout';

const clampFraction = (value: number) => Math.min(1, Math.max(0, value));

export function measureShapeGrowth(growth: ShapeGrowth, progress: number[]) {
  if (growth.type === 'trunk') {
    const lastStarted = progress.findLastIndex((amount) => amount > 0);
    return lastStarted === -1 ? 0 : growth.levelEnds[lastStarted];
  }
  if (growth.type === 'stem') {
    const { firstLevel, levelEnds } = growth;
    const lastStarted = progress
      .slice(firstLevel, firstLevel + levelEnds.length)
      .findLastIndex((amount) => amount > 0);
    return lastStarted === -1 ? 0 : levelEnds[lastStarted];
  }
  const { level, start, end } = growth;
  return clampFraction(((progress[level] ?? 0) - start) / (end - start));
}

export function getGrownShapes(layout: TreeLayout, progress: number[]) {
  return layout.shapes
    .map((shape) => ({
      ...shape,
      amount: measureShapeGrowth(shape.growth, progress),
    }))
    .filter(({ amount }) => amount > 0);
}

export type GrownShape = ReturnType<typeof getGrownShapes>[number];
