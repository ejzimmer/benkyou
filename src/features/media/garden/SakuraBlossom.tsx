import { toRadians } from '../shared/toRadians';
const PETAL =
  'M0 0 C-6.5 -3.5 -8 -11 -3.6 -14.4 L0 -12 L3.6 -14.4 C8 -11 6.5 -3.5 0 0 Z';
const PETAL_COUNT = 5;
const BUD_STAGE = 0.4;
const TIGHT_BUD = [-12, 55, 42];
const PLUMP_BUD = [-20, 75, 76];
const STAMEN_ANGLES = Array.from({ length: 8 }, (_, index) => index * 45 + 22);

const mixColour = (amount: number) => {
  const [hue, saturation, lightness] = TIGHT_BUD.map(
    (value, index) => value + (PLUMP_BUD[index] - value) * amount,
  );
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
};

type SakuraBlossomProps = {
  x: number;
  y: number;
  facing: number;
  openness: number;
  size: number;
};

export function SakuraBlossom({
  x,
  y,
  facing,
  openness,
  size,
}: SakuraBlossomProps) {
  const transform = `translate(${x} ${y}) rotate(${facing + 90}) scale(${size})`;

  if (openness < BUD_STAGE) {
    const swell = openness / BUD_STAGE;
    const length = 3.4 + swell * 2.6;
    const width = 1.7 + swell * 1.6;
    return (
      <g className="sakura-bud" transform={transform}>
        <path
          d={`M0 0 C${-width} ${-length * 0.4} ${-width * 0.7} ${-length} 0 ${-length - 1} C${width * 0.7} ${-length} ${width} ${-length * 0.4} 0 0 Z`}
          fill={mixColour(swell)}
        />
        <path
          className="sakura-sepals"
          d={`M0 0.5 L${-width * 0.9} ${-length * 0.35} M0 0.5 L${width * 0.9} ${-length * 0.35}`}
        />
      </g>
    );
  }

  const bloom = (openness - BUD_STAGE) / (1 - BUD_STAGE);
  return (
    <g className="sakura-blossom" transform={transform}>
      <g
        className="sakura-petals"
        transform={`translate(0 ${-6 * (1 - bloom)}) scale(${0.3 + 0.12 * bloom})`}
      >
        {Array.from({ length: PETAL_COUNT }, (_, index) => (
          <path
            key={index}
            d={PETAL}
            transform={`rotate(${180 + (index - 2) * 72 * bloom})`}
          />
        ))}
      </g>
      {bloom > 0.55 && (
        <>
          <circle className="sakura-centre" r={1.2} />
          {STAMEN_ANGLES.map((angle) => (
            <circle
              key={angle}
              className="sakura-anther"
              cx={Math.cos(toRadians(angle)) * 2.1}
              cy={Math.sin(toRadians(angle)) * 2.1}
              r={0.45}
            />
          ))}
        </>
      )}
    </g>
  );
}
