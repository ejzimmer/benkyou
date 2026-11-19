import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WisteriaRaceme } from './WisteriaRaceme';

const renderRaceme = (understood: number) =>
  render(
    <svg>
      <WisteriaRaceme
        seed="update"
        base={{ x: 0, y: 0 }}
        understood={understood}
      />
    </svg>,
  );

describe('WisteriaRaceme', () => {
  describe('when everything was understood', () => {
    it('has opened every bud', () => {
      renderRaceme(100);

      expect(screen.getAllByTestId('wisteria-floret')).toHaveLength(36);
    });
  });

  describe('when 90% was understood', () => {
    it('opens the top nine rows and leaves the rest in bud', () => {
      renderRaceme(90);

      expect(screen.getAllByTestId('wisteria-floret')).toHaveLength(27);
      expect(screen.getAllByTestId('wisteria-bud')).toHaveLength(9);
    });
  });
});
