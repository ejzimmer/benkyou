import { IconProps } from './types';

export function PencilIcon({ colour = 'currentColor', ...props }: IconProps) {
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
      <path d="M13,3 L17,7 7,17 2.5,17.5 3,13 Z M11,5 L15,9" />
    </svg>
  );
}
