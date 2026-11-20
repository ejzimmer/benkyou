import { IconProps } from './types';

export function PlusIcon({ colour = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      strokeLinecap="round"
      width="100%"
      stroke={colour}
      strokeWidth="2"
      fill="none"
      {...props}
    >
      <line x1="10" y1="2" x2="10" y2="18" />
      <line x1="2" y1="10" x2="18" y2="10" />
    </svg>
  );
}
