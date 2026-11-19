import { describe, it, expect } from 'vitest'
import { act, render, screen } from '@testing-library/react';
import { SaveStatusBanner } from './SaveStatusBanner';
import { SaveState } from './localFirst/createLocalFirstContext';

function renderBanner(initialState: SaveState) {
  let saveState = initialState;
  const listeners = new Set<() => void>();
  render(
    <SaveStatusBanner
      saveStatus={{
        subscribe: (onChange) => {
          listeners.add(onChange);
          return () => listeners.delete(onChange);
        },
        getSaveState: () => saveState,
      }}
    />,
  );
  return {
    changeSaveState: (state: SaveState) =>
      act(() => {
        saveState = state;
        listeners.forEach((onChange) => onChange());
      }),
  };
}

describe('SaveStatusBanner', () => {
  describe('when saves are failing', () => {
    it("says changes aren't saving", () => {
      renderBanner('failing');

      expect(screen.getByRole('alert')).toHaveTextContent(
        "Changes aren't saving.",
      );
    });

    describe('and they start working again', () => {
      it('goes away', () => {
        const { changeSaveState } = renderBanner('failing');
        const banner = screen.getByRole('alert');

        changeSaveState('saving');

        expect(banner).not.toBeInTheDocument();
      });
    });
  });

  describe('when this app version is out of date', () => {
    it('offers a reload', () => {
      renderBanner('outdated');

      expect(screen.getByRole('alert')).toHaveTextContent(
        "This version can't save any more.",
      );
      expect(
        screen.getByRole('button', { name: 'Reload' }),
      ).toBeInTheDocument();
    });
  });
});
