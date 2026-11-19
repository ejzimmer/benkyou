import { OUTLINE_WIDTH, TreeLayout } from './treeLayout';

export type SignpostPlacement = { side: 'left' | 'right'; offset: number };

const SIGN_HEIGHT = 80;
const MIN_OFFSET = 16;
const GAP = 6;

export function findSignpostPlacement({
  shapes,
}: TreeLayout): SignpostPlacement {
  const nearGround = shapes
    .flatMap(({ edges }) => edges.flatMap(({ left, right }) => [left, right]))
    .filter(({ y }) => y > -SIGN_HEIGHT);
  const clearanceFrom = (reaches: number[]) =>
    Math.max(MIN_OFFSET, Math.max(...reaches) + OUTLINE_WIDTH + GAP);
  const right = clearanceFrom(nearGround.map(({ x }) => x));
  const left = clearanceFrom(nearGround.map(({ x }) => -x));

  return right <= left
    ? { side: 'right', offset: right }
    : { side: 'left', offset: left };
}
