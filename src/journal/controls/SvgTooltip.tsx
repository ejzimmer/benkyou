import {
  MouseEvent,
  PointerEvent,
  ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { createHoverHandlers } from './createHoverHandlers';
import { PointerPosition } from './pointerPosition';
import { useTouchLongPress } from './useTouchLongPress';
import './Tooltip.css';
import './SvgTooltip.css';

export type SvgTooltipTriggerProps = {
  'aria-describedby': string;
  onPointerEnter: (event: PointerEvent<Element>) => void;
  onPointerLeave: (event: PointerEvent<Element>) => void;
  onPointerDown: (event: PointerEvent<Element>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onContextMenu: (event: MouseEvent<Element>) => void;
  onClickCapture: (event: MouseEvent<Element>) => void;
};

type SvgTooltipProps = {
  content: ReactNode;
  children: (triggerProps: SvgTooltipTriggerProps) => ReactNode;
};

// SVG elements can't be CSS anchors, and anchors inside a foreignObject don't
// resolve, so the popover is placed from the trigger's on-screen box instead.
export function SvgTooltip({ content, children }: SvgTooltipProps) {
  const id = useId();
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [triggerRect, setTriggerRect] = useState<DOMRect>();

  useEffect(() => {
    const tooltip = tooltipRef.current;
    const isOpen = tooltip?.matches(':popover-open');
    if (triggerRect && !isOpen) tooltip?.showPopover();
    if (!triggerRect && isOpen) tooltip?.hidePopover();
  }, [triggerRect]);

  const showTooltip = ({ currentTarget }: PointerPosition) =>
    setTriggerRect(currentTarget.getBoundingClientRect());
  const hideTooltip = () => setTriggerRect(undefined);

  const longPressHandlers = useTouchLongPress({
    onShow: showTooltip,
    onHide: hideTooltip,
  });

  return (
    <>
      {children({
        'aria-describedby': id,
        ...createHoverHandlers({ onShow: showTooltip, onHide: hideTooltip }),
        ...longPressHandlers,
      })}
      <foreignObject width="0" height="0">
        <div
          ref={tooltipRef}
          id={id}
          role="tooltip"
          className="tooltip svg-tooltip"
          popover="manual"
          style={
            triggerRect && {
              left: triggerRect.right,
              top: triggerRect.top + triggerRect.height / 2,
            }
          }
        >
          {content}
        </div>
      </foreignObject>
    </>
  );
}
