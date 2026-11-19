import { LadyBeetle, LadyBeetleColour } from './LadyBeetle';

type LadyBeetleIconProps = {
  colour: LadyBeetleColour;
  width?: string;
};

export function LadyBeetleIcon({ colour, width }: LadyBeetleIconProps) {
  return (
    <svg viewBox="0 0 36 30" width={width} aria-hidden="true">
      <LadyBeetle colour={colour} />
    </svg>
  );
}
