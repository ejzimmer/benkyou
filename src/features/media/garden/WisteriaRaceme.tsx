import { calculateBloomFraction } from './calculateBloomFraction';
import { createSeededRandom } from './seededRandom';
import { Point } from './treeGeometry';
import { WisteriaFloret } from './WisteriaFloret';

const ROWS = 13;
const TOP = 6;

type WisteriaRacemeProps = {
  seed: string;
  base: Point;
  understood: number;
  className?: string;
};

function createFlorets(seed: string, understood: number) {
  const random = createSeededRandom(seed);
  const length = 46 + random() * 10;
  const sway = (random() - 0.5) * 8;
  const openRows = Math.round(calculateBloomFraction(understood) * ROWS);
  const florets = Array.from({ length: ROWS }, (_, row) => {
    const t = row / (ROWS - 1);
    const centre = sway * t * t;
    const half = 6.2 * (1 - t) + 1.4;
    const count = row < ROWS - 3 ? 3 : 2;
    return Array.from({ length: count }, (_, index) => ({
      key: `${row}-${index}`,
      x:
        centre +
        (index / (count - 1) - 0.5) * 2 * half +
        (random() - 0.5) * 1.2,
      y: TOP + t * length + (random() - 0.5) * 1.5,
      t,
      isOpen: row < openRows,
    }));
  }).flat();
  return { florets, length, sway, scale: 0.62 + random() * 0.15 };
}

export function WisteriaRaceme({
  seed,
  base,
  understood,
  className,
}: WisteriaRacemeProps) {
  const { florets, length, sway, scale } = createFlorets(seed, understood);

  return (
    <g
      className={['wisteria-raceme', className].filter(Boolean).join(' ')}
      data-testid="wisteria-raceme"
      transform={`translate(${base.x} ${base.y}) scale(${scale})`}
    >
      <path
        className="raceme-stalk"
        d={`M0 0 Q${sway * 0.3} ${TOP + length / 2} ${sway} ${TOP + length}`}
      />
      {florets.map(({ key, x, y, t, isOpen }) =>
        isOpen ? (
          <WisteriaFloret key={key} x={x} y={y} scale={1 - t * 0.35} />
        ) : (
          <ellipse
            key={key}
            className="wisteria-bud"
            data-testid="wisteria-bud"
            cx={x}
            cy={y}
            rx={1.4 * (0.7 + (1 - t) * 0.5)}
            ry={2 * (0.7 + (1 - t) * 0.5)}
          />
        ),
      )}
    </g>
  );
}
