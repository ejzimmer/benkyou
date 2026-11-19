import { MouseEvent, PointerEvent } from 'react';

export type PointerPosition = Pick<
  MouseEvent<Element>,
  'currentTarget' | 'clientX' | 'clientY'
>;

export const isTouch = (event: PointerEvent<Element>) =>
  event.pointerType === 'touch';
