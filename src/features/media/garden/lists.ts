import { Timestamps } from './types';

export const getItemsByNumber = <T extends { number: number }>(
  items?: Record<string, T>,
) => Object.values(items ?? {}).toSorted((a, b) => a.number - b.number);

const compareAddedTimes = (a: Timestamps, b: Timestamps) => {
  if (!a.createdAt || !b.createdAt) {
    return Number(Boolean(a.createdAt)) - Number(Boolean(b.createdAt));
  }
  return Temporal.Instant.compare(a.createdAt, b.createdAt);
};

export const getItemsInAddedOrder = <T extends Timestamps>(
  items?: Record<string, T>,
) => Object.values(items ?? {}).toSorted(compareAddedTimes);
