import { ReactNode } from 'react';
import { Point } from './treeGeometry';

import './NewGrowth.css';

type NewGrowthProps = {
  isNew: boolean;
  origin?: Point;
  children: ReactNode;
};

export function NewGrowth({ isNew, origin, children }: NewGrowthProps) {
  if (!isNew) return children;
  if (!origin) return <g className="new-growth">{children}</g>;
  return (
    <g
      className="new-growth sprouting"
      style={{ transformOrigin: `${origin.x}px ${origin.y}px` }}
    >
      {children}
    </g>
  );
}
