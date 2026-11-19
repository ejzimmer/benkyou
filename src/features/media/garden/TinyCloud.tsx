import { useId } from 'react';
import { showPopoverOnMount } from '../shared/controls/showPopoverOnMount';

const PUFFS = [
  [20, 30, 14],
  [36, 19, 15],
  [54, 17, 13],
  [68, 29, 13],
];

type TinyCloudProps = { text: string; rect: DOMRect };

export function TinyCloud({ text, rect }: TinyCloudProps) {
  const outlineId = useId();

  return (
    <div
      ref={showPopoverOnMount}
      className="tiny-cloud-popover"
      popover="manual"
      style={{ left: rect.left + rect.width / 2, top: rect.top }}
    >
      <svg
        className="tiny-cloud"
        role="tooltip"
        viewBox="0 0 88 48"
        width="88"
        height="48"
      >
        <defs>
          <filter id={outlineId} x="-20%" y="-20%" width="140%" height="140%">
            <feMorphology
              in="SourceAlpha"
              operator="dilate"
              radius="1.5"
              result="grown"
            />
            <feFlood floodColor="hsl(214 32% 82%)" />
            <feComposite in2="grown" operator="in" result="outline" />
            <feMerge>
              <feMergeNode in="outline" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g fill="white" filter={`url(#${outlineId})`}>
          <rect x="12" y="24" width="64" height="20" rx="10" />
          {PUFFS.map(([cx, cy, r]) => (
            <circle key={cx} cx={cx} cy={cy} r={r} />
          ))}
        </g>
        <text x="44" y="34" textAnchor="middle">
          {text}
        </text>
      </svg>
    </div>
  );
}
