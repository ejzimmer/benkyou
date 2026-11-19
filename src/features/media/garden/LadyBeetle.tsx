import { useId } from 'react';

export type LadyBeetleColour = 'red' | 'yellow';

type Spot = [x: number, y: number, radius: number];

const INK = 'hsl(0 0% 14%)';
const SHELL_PATH = 'M3 22.5 C3 12 9 7.5 15.5 7.5 C21.5 7.5 26 11.5 26.5 22.5 Z';
const LEG_XS = [9, 15.5, 22];

const BEETLES: Record<LadyBeetleColour, { shell: string; spots: Spot[] }> = {
  red: {
    shell: 'hsl(3 85% 50%)',
    spots: [
      [9, 15, 2.2],
      [17.5, 12.5, 2.3],
      [21.5, 18.5, 2],
      [12.5, 20, 2],
      [5, 20.5, 1.6],
    ],
  },
  yellow: {
    shell: 'hsl(48 96% 56%)',
    spots: [
      [7.5, 14, 1.2],
      [12, 11, 1.3],
      [17, 9.8, 1.2],
      [21.5, 12.5, 1.3],
      [10, 17.5, 1.3],
      [15, 15, 1.3],
      [20, 17, 1.3],
      [24.5, 18, 1.1],
      [6, 20, 1.2],
      [13.5, 20.5, 1.2],
      [18, 21, 1.1],
    ],
  },
};

type LadyBeetleProps = {
  colour: LadyBeetleColour;
  legSwing?: number;
};

export function LadyBeetle({ colour, legSwing = 0 }: LadyBeetleProps) {
  const clipId = useId();
  const { shell, spots } = BEETLES[colour];

  return (
    <>
      <g
        stroke={INK}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {LEG_XS.map((x, index) => {
          const kick = index % 2 ? legSwing : -legSwing;
          return (
            <path
              key={x}
              d={`M${x} 22.5 L${x - 1 + kick / 2} 26 L${x - 3 + kick} 27.4`}
            />
          );
        })}
        <path d="M31 17.5 Q33.5 14 35.5 14.5" />
      </g>
      <circle cx="29.6" cy="20.2" r="3.4" fill={INK} />
      <circle cx="31" cy="19.2" r="0.8" fill="white" />
      <path d="M24.5 13.5 Q29 15 28.6 22.5 L24 22.5 Z" fill={INK} />
      <clipPath id={clipId}>
        <path d={SHELL_PATH} />
      </clipPath>
      <path d={SHELL_PATH} fill={shell} />
      <g clipPath={`url(#${clipId})`} fill={INK}>
        {spots.map(([x, y, radius]) => (
          <circle key={`${x},${y}`} cx={x} cy={y} r={radius} />
        ))}
      </g>
      <path
        d={SHELL_PATH}
        fill="none"
        stroke={INK}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M4 22.5 L28 22.5"
        stroke={INK}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M8 13 Q11 9.6 15 9.2"
        fill="none"
        stroke="white"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.55"
      />
    </>
  );
}
