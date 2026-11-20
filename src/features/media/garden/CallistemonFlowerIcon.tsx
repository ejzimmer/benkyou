const STAMEN_ANGLES = [-168, -140, -112, -68, -40, -12, 168, 12];
const SPIKE_YS = [8, 10.6, 13.2, 15.8, 18.4, 21, 23.6];

const STAMEN_TIPS = SPIKE_YS.flatMap((y) => {
  const length = 6 + 6 * (1 - Math.abs(y - 16) / 12);
  return STAMEN_ANGLES.map((angle) => {
    const radians = (angle * Math.PI) / 180;
    return {
      y,
      tipX: 16 + Math.cos(radians) * length,
      tipY: y + Math.sin(radians) * length * 0.7,
    };
  });
});

type CallistemonFlowerIconProps = { width?: string };

export function CallistemonFlowerIcon({ width }: CallistemonFlowerIconProps) {
  return (
    <svg viewBox="0 0 32 32" width={width} aria-hidden="true">
      <path
        d="M16 31 L16 3"
        stroke="hsl(28 45% 34%)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M16 4 Q11 1 10 -1 Q14 0 16 4 Z M16 4 Q21 1 22 -1 Q18 0 16 4 Z"
        fill="hsl(110 35% 45%)"
      />
      <g stroke="hsl(354 82% 46%)" strokeWidth="1.1" strokeLinecap="round">
        {STAMEN_TIPS.map(({ y, tipX, tipY }) => (
          <line key={`${tipX},${tipY}`} x1="16" y1={y} x2={tipX} y2={tipY} />
        ))}
      </g>
      <g fill="hsl(48 95% 58%)">
        {STAMEN_TIPS.map(({ tipX, tipY }) => (
          <circle key={`${tipX},${tipY}`} cx={tipX} cy={tipY} r="0.85" />
        ))}
      </g>
    </svg>
  );
}
