import { useEffect, useRef, useState } from 'react';
import { GrownShape } from './treeGrowth';

export const GROWTH_DURATION_MS = 1500;

type Amounts = Record<string, number>;

const easeOut = (t: number) => 1 - (1 - t) ** 3;

const readAmounts = (shapes: GrownShape[]): Amounts =>
  Object.fromEntries(shapes.map(({ key, amount }) => [key, amount]));

const describeAmounts = (amounts: Amounts) => JSON.stringify(amounts);

function blendAmounts(from: Amounts, to: Amounts, fraction: number) {
  const keys = new Set([...Object.keys(from), ...Object.keys(to)]);
  return Object.fromEntries(
    [...keys].map((key) => {
      const start = from[key] ?? 0;
      return [key, start + ((to[key] ?? 0) - start) * fraction];
    }),
  );
}

export function useGrowingShapes(shapes: GrownShape[]) {
  const targetAmounts = readAmounts(shapes);
  const targetDescription = describeAmounts(targetAmounts);
  const [shownAmounts, setShownAmounts] = useState(targetAmounts);
  const shownAmountsRef = useRef(shownAmounts);

  useEffect(() => {
    if (describeAmounts(shownAmountsRef.current) === targetDescription) return;
    const from = shownAmountsRef.current;
    const to: Amounts = JSON.parse(targetDescription);
    let frame: number;
    let start: number | undefined;

    const step = (now: number) => {
      start ??= now;
      const progress = Math.min(1, (now - start) / GROWTH_DURATION_MS);
      shownAmountsRef.current =
        progress === 1 ? to : blendAmounts(from, to, easeOut(progress));
      setShownAmounts(shownAmountsRef.current);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frame);
  }, [targetDescription]);

  return shapes
    .map((shape) => ({ ...shape, amount: shownAmounts[shape.key] ?? 0 }))
    .filter(({ amount }) => amount > 0);
}
