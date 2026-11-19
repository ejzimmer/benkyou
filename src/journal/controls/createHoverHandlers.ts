import { PointerEvent } from 'react';
import { isTouch, PointerPosition } from './pointerPosition';

type HoverCallbacks = {
  onShow: (position: PointerPosition) => void;
  onHide: () => void;
};

// Touch fires pointerenter on touch down and pointerleave on lift, so hover
// only counts for mouse and pen.
export const createHoverHandlers = ({ onShow, onHide }: HoverCallbacks) => ({
  onPointerEnter: (event: PointerEvent<Element>) => {
    if (!isTouch(event)) onShow(event);
  },
  onPointerLeave: (event: PointerEvent<Element>) => {
    if (!isTouch(event)) onHide();
  },
});
