import { CSSProperties, ReactNode } from 'react';
import { SignpostPlacement } from './findSignpostPlacement';
import { countSignposts } from './signposts';

type SignpostProps = {
  name: string;
  placement: SignpostPlacement;
  children?: ReactNode;
};

export function Signpost({ name, placement, children }: SignpostProps) {
  const posts = countSignposts(name);

  return (
    <div
      className={`signpost on-${placement.side}`}
      style={{ '--sign-offset': `${placement.offset}px` } as CSSProperties}
    >
      <div className="sign-board">{name}</div>
      <div className="sign-legs">
        <div className="sign-posts">
          {Array.from({ length: posts }, (_, index) => (
            <div key={index} className="sign-post" />
          ))}
        </div>
        <div className="sign-hangers">{children}</div>
      </div>
    </div>
  );
}
