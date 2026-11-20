import { Point } from './treeGeometry';

type WisteriaFloretProps = Point & { scale: number };

export function WisteriaFloret({ x, y, scale }: WisteriaFloretProps) {
  return (
    <g
      className="wisteria-floret"
      data-testid="wisteria-floret"
      transform={`translate(${x} ${y}) scale(${scale})`}
    >
      <path
        className="standard"
        d="M-3.4 -0.6 C-3.6 -4 3.6 -4 3.4 -0.6 Q0 1.2 -3.4 -0.6 Z"
      />
      <path className="keel" d="M-2 0 C-2 2.8 2 2.8 2 0 Q0 -0.8 -2 0 Z" />
      <circle className="blotch" cy="-1.4" r="0.8" />
    </g>
  );
}
