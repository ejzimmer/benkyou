import { IconProps } from './types';

export function TelevisionIcon({
  colour = 'currentColor',
  ...props
}: IconProps) {
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
      <path d="M3,7 L17,7 L17,17 L3,17 Z M7,2 L10,6 L13,2" />
    </svg>
  );
}
