import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SaguaroCrown } from './SaguaroCrown';
import { Video } from './types';

const video: Video = {
  id: 'v1',
  url: 'https://youtu.be/v1',
  lookups: 0,
  aiQuestions: 0,
};

const renderCrown = (understood: number) =>
  render(
    <svg>
      <SaguaroCrown
        spot={{ key: 'v1-crown', video, x: 0, y: 0, angle: -90, understood }}
      />
    </svg>,
  );

describe('SaguaroCrown', () => {
  describe('at 90% understood', () => {
    it('opens 11 of the 20 buds into flowers', () => {
      renderCrown(90);

      expect(screen.getAllByTestId('saguaro-blossom')).toHaveLength(11);
    });

    it('leaves the rest as buds', () => {
      renderCrown(90);

      expect(screen.getAllByTestId('saguaro-bud')).toHaveLength(9);
    });
  });

  describe('at 100% understood', () => {
    it('has flowered completely', () => {
      renderCrown(100);

      expect(screen.getAllByTestId('saguaro-blossom')).toHaveLength(20);
    });
  });
});
