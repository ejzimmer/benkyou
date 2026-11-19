import { ReactNode } from 'react';
import { ArcPosition } from './findArcPosition';

type SkyBodyProps = {
  className: string;
  position: ArcPosition;
  children?: ReactNode;
};

export function SkyBody({ className, position, children }: SkyBodyProps) {
  return (
    <div
      className={`sky-body ${className}`}
      style={{
        insetInlineStart: `calc(${position.across} * (100% - var(--body-size)))`,
        insetBlockStart: `calc(16px + ${1 - position.height} * (100% - 16px - var(--body-size) / 2))`,
      }}
    >
      {children}
    </div>
  );
}
