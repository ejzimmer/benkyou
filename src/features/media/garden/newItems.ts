export const findNextNumber = (
  items: Record<string, { number: number }> = {},
) => Math.max(0, ...Object.values(items).map(({ number }) => number)) + 1;
