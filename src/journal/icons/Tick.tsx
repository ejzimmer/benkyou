import { IconProps } from './types';

export function TickIcon({ colour = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      stroke={colour}
      strokeWidth="2"
      strokeLinecap="round"
      width="100%"
      fill="none"
      {...props}
    >
      <path d="M2,12 L8,18 18,3" pathLength="1" />
    </svg>
  );
}
