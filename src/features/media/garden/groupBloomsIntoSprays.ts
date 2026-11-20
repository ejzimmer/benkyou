import { measureBranchLength } from './findBranchPoint';
import { Bloom } from './getBlooms';
import { EdgeSample } from './treeGeometry';

export type Spray = {
  key: string;
  limbKey: string;
  at: number;
  blooms: Bloom[];
};

type Limb = { key: string; edges: EdgeSample[] };

const SPRAY_REACH = 16;
const SPRAY_SIZE = 4;

const findMeanPosition = (blooms: Bloom[]) =>
  blooms.reduce((total, { at }) => total + at, 0) / blooms.length;

export function groupBloomsIntoSprays(blooms: Bloom[], limbs: Limb[]) {
  return limbs.flatMap(({ key, edges }) => {
    const length = measureBranchLength(edges);
    const groups: Bloom[][] = [];
    blooms
      .filter(({ limbKey }) => limbKey === key)
      .toSorted((a, b) => a.at - b.at)
      .forEach((bloom) => {
        const group = groups.at(-1);
        const previous = group?.at(-1);
        if (
          group &&
          previous &&
          group.length < SPRAY_SIZE &&
          (bloom.at - previous.at) * length < SPRAY_REACH
        ) {
          group.push(bloom);
        } else {
          groups.push([bloom]);
        }
      });
    return groups.map((group): Spray => ({
      key: group[0].key,
      limbKey: key,
      at: findMeanPosition(group),
      blooms: group,
    }));
  });
}
