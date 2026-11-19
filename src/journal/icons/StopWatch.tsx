import { IconProps } from './types';

type StopWatchIconProps = IconProps & {
  handAngleDegrees?: number;
};

export function StopWatchIcon({
  colour = 'currentColor',
  handAngleDegrees = 0,
  ...props
}: StopWatchIconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      width="100%"
      stroke={colour}
      strokeWidth="2"
      fill="none"
      {...props}
    >
      <circle cx="10" cy="10" r="9" />
      <line
        x1="10"
        y1="10"
        x2="10"
        y2="2"
        transform={`rotate(${handAngleDegrees} 10 10)`}
      />
    </svg>
  );
}
