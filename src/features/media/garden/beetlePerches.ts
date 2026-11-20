import { measureBranchLength } from './findBranchPoint';
import { LadyBeetleColour } from './LadyBeetle';
import { BeetleSpot } from './placeBeetles';
import { EdgeSample } from './treeGeometry';
import { GrownShape } from './treeGrowth';

export const BASE_GAP = 0.12;
export const TIP_GAP = 0.08;
const BEETLE_ROOM = 12;
const TRUNK_FOOT = 0.02;

export type Perch = {
  shape: GrownShape;
  length: number;
  range: [number, number];
  colours: LadyBeetleColour[];
};

export function interleaveColours(reds: number, yellows: number) {
  return Array.from({ length: Math.max(reds, yellows) }, (_, index) => [
    ...(index < reds ? ['red' as const] : []),
    ...(index < yellows ? ['yellow' as const] : []),
  ]).flat();
}

export function createPerch(shape: GrownShape): Perch {
  return {
    shape,
    length: measureBranchLength(shape.edges),
    range: [BASE_GAP, shape.amount - TIP_GAP],
    colours: [],
  };
}

export function measureRoom(
  { length, range: [min, max] }: Perch,
  room = BEETLE_ROOM,
) {
  return Math.max(0, Math.floor(((max - min) * length) / room));
}

export function shareColours(perches: Perch[], colours: LadyBeetleColour[]) {
  const overflow: LadyBeetleColour[] = [];
  let next = 0;
  colours.forEach((colour) => {
    const withRoom = perches.filter(
      (perch) => perch.colours.length < measureRoom(perch),
    );
    if (!withRoom.length) {
      overflow.push(colour);
      return;
    }
    withRoom[next % withRoom.length].colours.push(colour);
    next++;
  });
  return overflow;
}

function findMiddle({ left, right }: EdgeSample) {
  return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
}

function findNearestAt(edges: EdgeSample[], target: EdgeSample) {
  const { x, y } = findMiddle(target);
  const measureDistance = (sample: EdgeSample) => {
    const middle = findMiddle(sample);
    return Math.hypot(middle.x - x, middle.y - y);
  };
  return edges.reduce((nearest, sample) =>
    measureDistance(sample) < measureDistance(nearest) ? sample : nearest,
  ).at;
}

export function createTrunkPerch(
  trunk: GrownShape,
  branch: GrownShape,
  colours: LadyBeetleColour[],
): Perch {
  const length = measureBranchLength(trunk.edges);
  const top = Math.min(
    trunk.amount,
    findNearestAt(trunk.edges, branch.edges[0]),
  );
  const bottom = Math.max(
    TRUNK_FOOT,
    top - (colours.length * BEETLE_ROOM) / length,
  );
  return { shape: trunk, length, range: [bottom, top], colours };
}

export function placeOnPerch(
  { shape, length, range, colours }: Perch,
  keyPrefix: string,
): BeetleSpot[] {
  const [min, max] = range;
  return colours.map((colour, slot) => ({
    key: `${keyPrefix}-${slot}`,
    colour,
    edges: shape.edges,
    length,
    range,
    at: min + ((max - min) * (slot + 0.5)) / colours.length,
    forward: slot % 2 === 0,
  }));
}
