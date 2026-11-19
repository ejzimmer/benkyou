import { IconProps } from './types';

export function OpenBookIcon({ colour = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      stroke={colour}
      strokeWidth="2"
      strokeLinejoin="round"
      strokeLinecap="round"
      width="100%"
      fill="none"
      {...props}
    >
      <path d="M10,5 C7.5,3.2 4.5,3 2,4 L2,16 C4.5,15 7.5,15.2 10,17 C12.5,15.2 15.5,15 18,16 L18,4 C15.5,3 12.5,3.2 10,5 Z M10,5 L10,17" />
    </svg>
  );
}
