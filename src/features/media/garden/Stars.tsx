import { createSeededRandom } from './seededRandom';

const random = createSeededRandom('stars');
const stars = Array.from({ length: 60 }, () => ({
  x: random() * 100,
  y: random() * 85,
  r: 0.6 + random() * 1.2,
}));

export function Stars() {
  return (
    <svg className="stars">
      {stars.map(({ x, y, r }, index) => (
        <circle key={index} cx={`${x}%`} cy={`${y}%`} r={r} />
      ))}
    </svg>
  );
}
