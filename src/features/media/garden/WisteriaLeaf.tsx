import { VineLeaf } from './placeVineLeaves';

const LEAFLET_PATH = 'M0 0 C1.2 -1.9 4 -2 6 0 C4 2 1.2 1.9 0 0 Z';
const LEAFLET_PAIRS = [0, 1, 2, 3].map((pair) => ({
  x: 2.5 + pair * 3.4,
  y: pair * pair * 0.18,
  splay: 62 - pair * 4,
}));
const YOUNG_SIZE = 0.85;

type WisteriaLeafProps = {
  leaf: VineLeaf;
};

export function WisteriaLeaf({
  leaf: { x, y, angle, size },
}: WisteriaLeafProps) {
  return (
    <g
      className={size < YOUNG_SIZE ? 'wisteria-leaf young' : 'wisteria-leaf'}
      transform={`translate(${x} ${y}) rotate(${angle}) scale(${size})`}
    >
      <path className="rachis" d="M0 0 Q9 0.5 16 3" />
      {LEAFLET_PAIRS.flatMap(({ x: leafletX, y: leafletY, splay }) => [
        <path
          key={`${leafletX}-up`}
          d={LEAFLET_PATH}
          transform={`translate(${leafletX} ${leafletY}) rotate(${-splay})`}
        />,
        <path
          key={`${leafletX}-down`}
          d={LEAFLET_PATH}
          transform={`translate(${leafletX} ${leafletY}) rotate(${splay})`}
        />,
      ])}
      <path d={LEAFLET_PATH} transform="translate(15.5 3) rotate(12)" />
    </g>
  );
}
