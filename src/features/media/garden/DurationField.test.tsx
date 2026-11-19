import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DurationField } from './DurationField';

describe('DurationField', () => {
  describe('in minutes and seconds', () => {
    it('has an input for each', () => {
      render(
        <DurationField label="Length" name="length" durationFormat="mm:ss" />,
      );

      expect(
        screen
          .getAllByRole('textbox')
          .map((input) => input.getAttribute('aria-label')),
      ).toEqual(['Minutes', 'Seconds']);
    });
  });

  describe('in hours, minutes and seconds', () => {
    it('has an input for each', () => {
      render(
        <DurationField
          label="Length"
          name="length"
          durationFormat="hh:mm:ss"
        />,
      );

      expect(
        screen
          .getAllByRole('textbox')
          .map((input) => input.getAttribute('aria-label')),
      ).toEqual(['Hours', 'Minutes', 'Seconds']);
    });
  });

  describe('with a value', () => {
    it('shows it split into two-digit segments', () => {
      render(
        <DurationField
          label="Length"
          name="length"
          defaultValue={3725}
          durationFormat="hh:mm:ss"
        />,
      );

      expect(
        screen
          .getAllByRole('textbox')
          .map((input) => input.getAttribute('value')),
      ).toEqual(['01', '02', '05']);
    });
  });

  describe('when a single digit is entered', () => {
    it('pads it to two digits on leaving the input', async () => {
      const user = userEvent.setup();
      render(
        <DurationField label="Length" name="length" durationFormat="mm:ss" />,
      );
      const seconds = screen.getByRole('textbox', { name: 'Seconds' });

      await user.type(seconds, '6');
      await user.tab();

      expect(seconds).toHaveValue('06');
    });
  });

  describe('when two digits are typed', () => {
    describe('in the hours', () => {
      it('moves focus to the minutes', async () => {
        const user = userEvent.setup();
        render(
          <DurationField
            label="Length"
            name="length"
            durationFormat="hh:mm:ss"
          />,
        );

        await user.type(screen.getByRole('textbox', { name: 'Hours' }), '01');

        expect(screen.getByRole('textbox', { name: 'Minutes' })).toHaveFocus();
      });
    });

    describe('in the minutes', () => {
      it('moves focus to the seconds', async () => {
        const user = userEvent.setup();
        render(
          <DurationField label="Length" name="length" durationFormat="mm:ss" />,
        );

        await user.type(screen.getByRole('textbox', { name: 'Minutes' }), '12');

        expect(screen.getByRole('textbox', { name: 'Seconds' })).toHaveFocus();
      });

      describe('when the seconds already have a value', () => {
        it('replaces it with what is typed next', async () => {
          const user = userEvent.setup();
          render(
            <DurationField
              label="Length"
              name="length"
              defaultValue={5}
              durationFormat="mm:ss"
            />,
          );
          const minutes = screen.getByRole('textbox', { name: 'Minutes' });

          await user.clear(minutes);
          await user.type(minutes, '12');
          await user.keyboard('34');

          expect(screen.getByRole('textbox', { name: 'Seconds' })).toHaveValue(
            '34',
          );
        });
      });
    });
  });
});
