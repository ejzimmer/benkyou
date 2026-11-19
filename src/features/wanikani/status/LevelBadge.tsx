import { formatPoints, getHexVertices } from './gemGeometry';

const CENTRE = 50;
const core = getHexVertices(CENTRE, CENTRE, 42);
const table = getHexVertices(CENTRE, CENTRE, 24);
const facets =
  core
    .map((vertex, index) => `M${formatPoints([vertex, table[index]])}`)
    .join('') + `M${formatPoints(table).split(' ').join('L')}Z`;

export function LevelBadge() {
  return (
    <svg className="level-badge" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id="wanikani-status-badge-core" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2d4386" />
          <stop offset="1" stopColor="#0f1838" />
        </linearGradient>
        <clipPath id="wanikani-status-badge-clip">
          <polygon points={formatPoints(core)} />
        </clipPath>
      </defs>
      <polygon
        points={formatPoints(getHexVertices(CENTRE, CENTRE, 50))}
        fill="url(#wanikani-status-gold)"
      />
      <polygon points={formatPoints(core)} fill="url(#wanikani-status-badge-core)" />
      <path d={facets} stroke="white" strokeOpacity={0.15} fill="none" />
      <g clipPath="url(#wanikani-status-badge-clip)">
        <rect
          className="badge-shine"
          x="20"
          y="0"
          width="14"
          height="100"
          fill="white"
          fillOpacity={0.25}
        />
      </g>
    </svg>
  );
}
