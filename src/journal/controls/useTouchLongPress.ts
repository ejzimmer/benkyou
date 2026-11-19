import { MouseEvent, PointerEvent, useRef } from 'react';
import { isTouch, PointerPosition } from './pointerPosition';

export const LONG_PRESS_MS = 500;

type TouchLongPressCallbacks = {
  onShow: (position: PointerPosition) => void;
  onHide: () => void;
};

export function useTouchLongPress({ onShow, onHide }: TouchLongPressCallbacks) {
  const pressTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isTouchPress = useRef(false);
  const wasLongPress = useRef(false);

  const cancelPress = () => clearTimeout(pressTimer.current);

  return {
    onPointerDown: (event: PointerEvent<Element>) => {
      isTouchPress.current = isTouch(event);
      wasLongPress.current = false;
      if (!isTouchPress.current) return;

      const { currentTarget, clientX, clientY } = event;
      pressTimer.current = setTimeout(() => {
        wasLongPress.current = true;
        onShow({ currentTarget, clientX, clientY });
        document.addEventListener('pointerdown', onHide, {
          once: true,
          capture: true,
        });
      }, LONG_PRESS_MS);
    },
    onPointerUp: cancelPress,
    onPointerCancel: cancelPress,
    // Cancelling a touch contextmenu also stops Android selecting text or
    // opening its own long-press menu.
    onContextMenu: (event: MouseEvent<Element>) => {
      if (isTouchPress.current) event.preventDefault();
    },
    onClickCapture: (event: MouseEvent<Element>) => {
      if (wasLongPress.current) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
  };
}
