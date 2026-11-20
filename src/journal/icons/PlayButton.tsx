import { IconProps } from './types';

export function PlayButtonIcon({
  colour = 'currentColor',
  ...props
}: IconProps) {
  return (
    <svg
      stroke={colour}
      fill={colour}
      width="100%"
      strokeWidth="2"
      viewBox="0 0 20 20"
      strokeLinejoin="round"
      strokeLinecap="round"
      {...props}
    >
      <path d="M4,4 L16,10 4,16z" />
    </svg>
  );
}
