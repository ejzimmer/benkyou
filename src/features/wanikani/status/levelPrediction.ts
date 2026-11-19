import { LevelProgression, MAX_LEVEL } from './types';

function findLatestProgressionsByLevel(levelProgressions: LevelProgression[]) {
  const progressionsByLevel = new Map<number, LevelProgression>();
  levelProgressions
    .filter((progression) => !progression.abandonedAt)
    .toSorted((a, b) => (a.unlockedAt ?? '').localeCompare(b.unlockedAt ?? ''))
    .forEach((progression) =>
      progressionsByLevel.set(progression.level, progression),
    );
  return progressionsByLevel;
}

function measureDays(from: string, to: string | Temporal.Instant) {
  return Temporal.Instant.from(from).until(to).total('hours') / 24;
}

function calculatePercentile(sortedValues: number[], fraction: number) {
  const index = (sortedValues.length - 1) * fraction;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  return (
    sortedValues[lower] +
    (sortedValues[upper] - sortedValues[lower]) * (index - lower)
  );
}

function calculateAverage(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function removeOutliers(values: number[]) {
  if (values.length < 4) return values;

  const sorted = values.toSorted((a, b) => a - b);
  const lowerQuartile = calculatePercentile(sorted, 0.25);
  const upperQuartile = calculatePercentile(sorted, 0.75);
  const limit = upperQuartile + 1.5 * (upperQuartile - lowerQuartile);
  return values.filter((value) => value <= limit);
}

export function predictDaysToFinish(
  levelProgressions: LevelProgression[],
  currentLevel: number,
): number | undefined {
  const progressionsByLevel = findLatestProgressionsByLevel(levelProgressions);
  const current = progressionsByLevel.get(currentLevel);
  if (currentLevel === MAX_LEVEL && current?.passedAt) return 0;

  const levelDurations = [...progressionsByLevel.values()].flatMap(
    ({ unlockedAt, passedAt }) =>
      unlockedAt && passedAt ? [measureDays(unlockedAt, passedAt)] : [],
  );
  const typicalDurations = removeOutliers(levelDurations);
  if (typicalDurations.length === 0) return undefined;

  const daysOnCurrentLevel = current?.unlockedAt
    ? measureDays(current.unlockedAt, Temporal.Now.instant())
    : 0;
  const completedAverage = calculateAverage(typicalDurations);
  const averageDuration =
    daysOnCurrentLevel > completedAverage
      ? calculateAverage([...typicalDurations, daysOnCurrentLevel])
      : completedAverage;
  const daysLeftOnCurrentLevel = Math.max(
    0,
    averageDuration - daysOnCurrentLevel,
  );

  return Math.ceil(
    daysLeftOnCurrentLevel + averageDuration * (MAX_LEVEL - currentLevel),
  );
}
