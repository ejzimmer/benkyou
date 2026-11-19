import { calculateBloomFraction } from './calculateBloomFraction';
import { SaguaroBlossom } from './SaguaroBlossom';
import { SaguaroBud } from './SaguaroBud';
import { createSeededRandom } from './seededRandom';
import { CrownSpot } from './placeCrowns';

const BLOOM_EXPONENT = 6;

const BUD_SPOTS = [
  { x: -11, y: 2.5 },
  { x: 11, y: 2.5 },
  { x: -10, y: -1.5 },
  { x: 10, y: -1.5 },
  { x: -7.5, y: -3 },
  { x: -2.5, y: -3.5 },
  { x: 2.5, y: -3.5 },
  { x: 7.5, y: -3 },
  { x: -8.5, y: -6.5 },
  { x: -4.5, y: -7 },
  { x: 0, y: -7.5 },
  { x: 4.5, y: -7 },
  { x: 8.5, y: -6.5 },
  { x: -6, y: -10.5 },
  { x: -2, y: -11 },
  { x: 2, y: -11 },
  { x: 6, y: -10.5 },
  { x: -3.5, y: -14 },
  { x: 0.5, y: -14.5 },
  { x: 4, y: -14 },
];

function pickOpenBuds(seed: string, understood: number) {
  const random = createSeededRandom(seed);
  const order = BUD_SPOTS.map((_, index) => ({ index, rank: random() }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ index }) => index);
  const openCount = Math.round(
    calculateBloomFraction(understood, BLOOM_EXPONENT) * BUD_SPOTS.length,
  );
  return new Set(order.slice(0, openCount));
}

type SaguaroCrownProps = { spot: CrownSpot };

export function SaguaroCrown({ spot }: SaguaroCrownProps) {
  const open = pickOpenBuds(spot.key, spot.understood);

  return (
    <g
      className="saguaro-crown"
      transform={`translate(${spot.x} ${spot.y}) rotate(${spot.angle + 90})`}
    >
      {BUD_SPOTS.map((bud, index) =>
        open.has(index) ? null : <SaguaroBud key={index} {...bud} />,
      )}
      {BUD_SPOTS.map((bud, index) =>
        open.has(index) ? <SaguaroBlossom key={index} {...bud} /> : null,
      )}
    </g>
  );
}
