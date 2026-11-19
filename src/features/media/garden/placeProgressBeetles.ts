import {
  BASE_GAP,
  createPerch,
  createTrunkPerch,
  interleaveColours,
  measureRoom,
  Perch,
  placeOnPerch,
} from './beetlePerches';
import { calculateUpdatePosition } from './calculateUpdatePosition';
import { getProgressUpdates } from './getProgressUpdates';
import { LadyBeetleColour } from './LadyBeetle';
import { getItemsByNumber } from './lists';
import { BeetleSpot } from './placeBeetles';
import { GrownShape } from './treeGrowth';
import { PrintSeries, Volume } from './types';
import { readVolumeProgress } from './volumeProgress';

const SCATTERED_BEETLE_ROOM = 6;

type KeyedBeetle = { key: string; colour: LadyBeetleColour; order: number };

type Stretch = { perch: Perch; room: number; beetles: KeyedBeetle[] };

function createStretches(
  series: PrintSeries,
  volume: Volume,
  limb: GrownShape,
): Stretch[] {
  const limbPerch = createPerch(limb);
  const [limbStart, limbEnd] = limbPerch.range;
  const progress = readVolumeProgress(series, volume);
  let start = BASE_GAP;
  let order = 0;
  return getProgressUpdates(volume).map((update) => {
    const end = Math.min(
      limbEnd,
      Math.max(start, calculateUpdatePosition(volume, update, progress)),
    );
    const perch: Perch = {
      ...limbPerch,
      range: [Math.max(limbStart, start), end],
    };
    start = end;
    return {
      perch,
      room: measureRoom(perch, SCATTERED_BEETLE_ROOM),
      beetles: interleaveColours(update.lookups, update.aiQuestions).map(
        (colour, index) => ({
          key: `${update.key}-beetle-${index}`,
          colour,
          order: order++,
        }),
      ),
    };
  });
}

function findNearestStretchWithRoom(stretches: Stretch[], from: number) {
  for (let distance = 1; distance < stretches.length; distance++) {
    const nearest = [from - distance, from + distance]
      .map((index) => stretches[index])
      .find((stretch) => stretch && stretch.beetles.length < stretch.room);
    if (nearest) return nearest;
  }
}

function moveOverflowToNeighbours(stretches: Stretch[]) {
  const trunkBeetles: KeyedBeetle[] = [];
  stretches.forEach((stretch, index) => {
    const overflow = stretch.beetles.splice(stretch.room);
    overflow.forEach((beetle) => {
      const neighbour = findNearestStretchWithRoom(stretches, index);
      (neighbour?.beetles ?? trunkBeetles).push(beetle);
    });
  });
  stretches.forEach((stretch) =>
    stretch.beetles.sort((a, b) => a.order - b.order),
  );
  return trunkBeetles;
}

function placeKeyedBeetles(perch: Perch, beetles: KeyedBeetle[]) {
  return placeOnPerch(
    { ...perch, colours: beetles.map(({ colour }) => colour) },
    'beetle',
  ).map((spot, index) => ({ ...spot, key: beetles[index].key }));
}

export function placeProgressBeetles(
  series: PrintSeries,
  shapes: GrownShape[],
): BeetleSpot[] {
  const trunk = shapes.find(({ key }) => key === 'trunk');
  return getItemsByNumber(series.volumes).flatMap((volume) => {
    const limb = shapes.find(({ key }) => key === `${volume.id}-limb`);
    if (!limb) return [];
    const stretches = createStretches(series, volume, limb);
    const trunkBeetles = moveOverflowToNeighbours(stretches);

    return [
      ...stretches.flatMap(({ perch, beetles }) =>
        placeKeyedBeetles(perch, beetles),
      ),
      ...(trunk && trunkBeetles.length
        ? placeKeyedBeetles(
            createTrunkPerch(
              trunk,
              limb,
              trunkBeetles.map(({ colour }) => colour),
            ),
            trunkBeetles,
          )
        : []),
    ];
  });
}
