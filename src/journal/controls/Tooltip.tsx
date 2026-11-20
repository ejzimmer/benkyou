import {
  FocusEvent,
  MouseEvent,
  PointerEvent,
  ReactNode,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
} from 'react';
import { createHoverHandlers } from './createHoverHandlers';
import { useTouchLongPress } from './useTouchLongPress';
import './Tooltip.css';

type TooltipPosition = 'top' | 'right' | 'top-right';

export type TooltipTriggerProps = {
  ref: (trigger: HTMLElement | null) => void;
  'aria-describedby': string;
  onPointerEnter: (event: PointerEvent<Element>) => void;
  onPointerLeave: (event: PointerEvent<Element>) => void;
  onPointerDown: (event: PointerEvent<Element>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onContextMenu: (event: MouseEvent<Element>) => void;
  onClickCapture: (event: MouseEvent<Element>) => void;
  onFocus: (event: FocusEvent<Element>) => void;
  onBlur: () => void;
};

type TooltipProps = {
  label: string;
  position?: TooltipPosition;
  isOpen?: boolean;
  children: (triggerProps: TooltipTriggerProps) => ReactNode;
};

export function Tooltip({
  label,
  position = 'right',
  isOpen,
  children,
}: TooltipProps) {
  const id = useId();
  const anchorName = `--tooltip${id.replace(/[^\w-]/g, '-')}`;
  const tooltipRef = useRef<HTMLDivElement>(null);

  const anchorTooltipToTrigger = (trigger: HTMLElement | null) => {
    trigger?.style.setProperty('anchor-name', anchorName);
  };

  const showTooltip = () => {
    const tooltip = tooltipRef.current;
    if (tooltip && !tooltip.matches(':popover-open')) {
      tooltip.showPopover();
    }
  };

  const hideTooltip = () => {
    const tooltip = tooltipRef.current;
    if (tooltip?.matches(':popover-open')) {
      tooltip.hidePopover();
    }
  };

  const setTooltipOpen = useEffectEvent((open: boolean) =>
    open ? showTooltip() : hideTooltip(),
  );

  useEffect(() => {
    if (isOpen !== undefined) {
      setTooltipOpen(isOpen);
    }
  }, [isOpen]);

  const longPressHandlers = useTouchLongPress({
    onShow: showTooltip,
    onHide: hideTooltip,
  });

  const showTooltipOnKeyboardFocus = (event: FocusEvent<Element>) => {
    if (event.target.matches(':focus-visible')) {
      showTooltip();
    }
  };

  return (
    <>
      {children({
        ref: anchorTooltipToTrigger,
        'aria-describedby': id,
        ...createHoverHandlers({ onShow: showTooltip, onHide: hideTooltip }),
        ...longPressHandlers,
        onFocus: showTooltipOnKeyboardFocus,
        onBlur: hideTooltip,
      })}
      <div
        ref={tooltipRef}
        id={id}
        role="tooltip"
        className={`tooltip tooltip-${position}`}
        popover="manual"
        style={{ positionAnchor: anchorName }}
      >
        {label}
      </div>
    </>
  );
}
