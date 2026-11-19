import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { longPress } from './longPressTestUtils';
import { SvgTooltip } from './SvgTooltip';

function setUpSvgTooltip() {
  render(
    <svg>
      <SvgTooltip content="21s">
        {(triggerProps) => (
          <circle {...triggerProps} data-testid="ring" r={10} />
        )}
      </SvgTooltip>
    </svg>,
  );
  return {
    trigger: screen.getByTestId('ring'),
    tooltip: screen.getByText('21s'),
  };
}

describe('SvgTooltip', () => {
  describe('when the pointer moves over the trigger', () => {
    it('shows the tooltip', async () => {
      const { trigger, tooltip } = setUpSvgTooltip();

      await userEvent.hover(trigger);

      expect(tooltip).toBeVisible();
    });

    it('describes the trigger', () => {
      const { trigger } = setUpSvgTooltip();

      expect(trigger).toHaveAccessibleDescription('21s');
    });

    describe('and then moves away', () => {
      it('hides the tooltip again', async () => {
        const { trigger, tooltip } = setUpSvgTooltip();
        await userEvent.hover(trigger);

        await userEvent.unhover(trigger);

        expect(tooltip).not.toBeVisible();
      });
    });
  });

  describe('on a touchscreen', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    describe('when the user long-presses the trigger', () => {
      it('shows the tooltip', async () => {
        const user = userEvent.setup({
          advanceTimers: (ms) => vi.advanceTimersByTime(ms),
        });
        const { trigger, tooltip } = setUpSvgTooltip();

        await longPress(user, trigger);

        expect(tooltip).toBeVisible();
      });

      describe('and then touches the screen again', () => {
        it('hides the tooltip', async () => {
          const user = userEvent.setup({
            advanceTimers: (ms) => vi.advanceTimersByTime(ms),
          });
          const { trigger, tooltip } = setUpSvgTooltip();
          await longPress(user, trigger);

          await user.pointer({ keys: '[TouchA]', target: document.body });

          expect(tooltip).not.toBeVisible();
        });
      });
    });
  });
});
