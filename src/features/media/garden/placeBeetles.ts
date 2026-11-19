import {
  createPerch,
  createTrunkPerch,
  interleaveColours,
  placeOnPerch,
  Perch,
  shareColours,
} from './beetlePerches';
import { findUpSide } from './findBeetlePose';
import { findBranchPoint } from './findBranchPoint';
import { LadyBeetleColour } from './LadyBeetle';
import { EdgeSample } from './treeGeometry';
import { GrownShape } from './treeGrowth';
import { Comprehension } from './types';

export type BeetleSpot = {
  key: string;
  colour: LadyBeetleColour;
  edges: EdgeSample[];
  length: number;
  range: [number, number];
  at: number;
  forward: boolean;
  isUnderside?: boolean;
};

type BeetleHost = Comprehension & { id: string };

function findSideOfTrunk({ shape, range }: Perch, branch: GrownShape) {
  const point = findBranchPoint(shape.edges, range[1]);
  const angle = (point.angle * Math.PI) / 180;
  const { left, right } = branch.edges[0];
  const dx = (left.x + right.x) / 2 - point.x;
  const dy = (left.y + right.y) / 2 - point.y;
  return -Math.sin(angle) * dx + Math.cos(angle) * dy > 0 ? 1 : -1;
}

export function placeBeetles(
  hosts: BeetleHost[],
  shapes: GrownShape[],
): BeetleSpot[] {
  const trunk = shapes.find(({ key }) => key === 'trunk');
  return hosts.flatMap((host) => {
    const hostShapes = shapes.filter(({ key }) =>
      key.startsWith(`${host.id}-`),
    );
    if (!hostShapes.length) return [];
    const perches = hostShapes.map(createPerch);
    const overflow = shareColours(
      perches,
      interleaveColours(host.lookups, host.aiQuestions),
    );
    const trunkPerches =
      trunk && overflow.length
        ? [createTrunkPerch(trunk, hostShapes[0], overflow)]
        : [];

    return [
      ...perches.flatMap((perch) =>
        placeOnPerch(perch, `${perch.shape.key}-beetle`).map((spot) => ({
          ...spot,
          isUnderside: true,
        })),
      ),
      ...trunkPerches.flatMap((perch) =>
        placeOnPerch(perch, `${host.id}-trunk-beetle`).map((spot) => ({
          ...spot,
          isUnderside:
            findSideOfTrunk(perch, hostShapes[0]) !==
            findUpSide(perch.shape.edges),
        })),
      ),
    ];
  });
}
