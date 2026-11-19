import { IconProps } from './types';

export function XIcon({ colour = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      stroke={colour}
      strokeWidth="2"
      strokeLinecap="round"
      width="100%"
      {...props}
    >
      <path d="M3,3 L17,17" />
      <path d="M17,3 L3,17" />
    </svg>
  );
}
