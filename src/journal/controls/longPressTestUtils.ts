import { vi } from 'vitest'
import { act, fireEvent } from '@testing-library/react';
import { UserEvent } from '@testing-library/user-event';
import { LONG_PRESS_MS } from './useTouchLongPress';

export async function longPress(
  user: UserEvent,
  target: Element,
  coords?: { clientX: number; clientY: number },
) {
  await user.pointer({ keys: '[TouchA>]', target, coords });
  act(() => {
    vi.advanceTimersByTime(LONG_PRESS_MS);
  });
  const notCancelled = fireEvent.contextMenu(target, coords);
  await user.pointer({ keys: '[/TouchA]', target, coords });
  return { notCancelled };
}
