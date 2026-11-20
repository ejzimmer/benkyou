import { turnToward } from './treeGeometry';
import { PrintSeries } from './types';

type Random = () => number;

export type ShootStyle = {
  spacing: number;
  length: [number, number];
  splay: number;
  bendToward: number;
  bend: number;
  widths: [number, number];
  leafGap: number;
  leafSplay: number;
  tuft: number[];
};

export type TreeSpecies = {
  trunkWidths: [number, number];
  firstLevel: number;
  levelSpacing: [number, number];
  trunkSway: number;
  measureLimb: (pages: number) => number;
  limbWidths: [number, number];
  limbSegments: number;
  findStartAngle: (side: number, random: Random) => number;
  bendLimb: (angle: number, index: number, random: Random) => number;
  twigCount: [number, number];
  findTwigAngle: (angle: number, random: Random) => number;
  bendTwig: (angle: number, index: number, random: Random) => number;
  shoots: ShootStyle;
};

const UP = -90;
const DOWN = 90;

const swayAlternately = (index: number, amount: number) =>
  (index % 2 ? 1 : -1) * amount;

const CALLISTEMON: TreeSpecies = {
  trunkWidths: [13, 8],
  firstLevel: 58,
  levelSpacing: [38, 52],
  trunkSway: 7,
  measureLimb: (pages) => 56 + pages * 0.17,
  limbWidths: [7, 3.5],
  limbSegments: 5,
  findStartAngle: (side, random) =>
    side < 0 ? -118 - random() * 22 : -62 + random() * 22,
  bendLimb: (angle, index, random) =>
    turnToward(angle, DOWN, 0.08 + index * 0.07) + (random() - 0.5) * 16,
  twigCount: [1, 2],
  findTwigAngle: (angle, random) =>
    turnToward(angle, DOWN, 0.35 + random() * 0.2),
  bendTwig: (angle, _, random) =>
    turnToward(angle, DOWN, 0.18) + (random() - 0.5) * 12,
  shoots: {
    spacing: 16,
    length: [16, 24],
    splay: 45,
    bendToward: DOWN,
    bend: 0.2,
    widths: [2, 0.9],
    leafGap: 5.5,
    leafSplay: 32,
    tuft: [-28, 0, 28],
  },
};

const SAKURA: TreeSpecies = {
  trunkWidths: [22, 11],
  firstLevel: 44,
  levelSpacing: [30, 40],
  trunkSway: 10,
  measureLimb: (pages) => 74 + pages * 0.22,
  limbWidths: [9, 4],
  limbSegments: 6,
  findStartAngle: (side, random) =>
    side < 0 ? -178 + random() * 18 : -2 - random() * 18,
  bendLimb: (angle, index, random) =>
    turnToward(angle, UP, 0.015) + swayAlternately(index, 8 + random() * 10),
  twigCount: [1, 3],
  findTwigAngle: (angle, random) => turnToward(angle, UP, 0.3 + random() * 0.2),
  bendTwig: (angle, index, random) =>
    angle + swayAlternately(index, 10 + random() * 14),
  shoots: {
    spacing: 18,
    length: [15, 22],
    splay: 45,
    bendToward: UP,
    bend: 0.1,
    widths: [2.2, 1],
    leafGap: 11,
    leafSplay: 50,
    tuft: [-35, 35],
  },
};

export const TREE_SPECIES: Record<PrintSeries['type'], TreeSpecies> = {
  book: CALLISTEMON,
  manga: SAKURA,
};
