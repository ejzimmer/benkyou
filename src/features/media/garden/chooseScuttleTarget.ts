const SHORTEST_SCUTTLE = 5;
const LONGEST_SCUTTLE = 17;
const SMALLEST_MOVE = 2;

export function chooseScuttleTarget(
  at: number,
  [min, max]: [number, number],
  length: number,
  random: () => number,
) {
  const distance =
    (SHORTEST_SCUTTLE + random() * (LONGEST_SCUTTLE - SHORTEST_SCUTTLE)) /
    length;
  const direction = random() < 0.5 ? 1 : -1;
  const target = Math.min(max, Math.max(min, at + distance * direction));
  return Math.abs(target - at) * length < SMALLEST_MOVE ? undefined : target;
}
