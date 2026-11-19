import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { Beetle } from './Beetle';
import { BeetleSpot } from './placeBeetles';

const spot: BeetleSpot = {
  key: 'beetle',
  colour: 'red',
  edges: Array.from({ length: 11 }, (_, index) => ({
    at: index / 10,
    left: { x: index * 10, y: 2 },
    right: { x: index * 10, y: -2 },
  })),
  length: 100,
  range: [0.1, 0.9],
  at: 0.5,
  forward: true,
};

const renderBeetle = () =>
  render(
    <svg>
      <Beetle spot={spot} />
    </svg>,
  );

describe('Beetle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.2);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('starts at its spot on the branch', () => {
    renderBeetle();
    expect(screen.getByTestId('beetle')).toHaveAttribute(
      'transform',
      expect.stringMatching(/^translate\(50 -1\.6\d*\) rotate\(0\)/),
    );
  });

  describe('after resting for a while', () => {
    it('scuttles to a new spot along the branch', () => {
      renderBeetle();
      const beetle = screen.getByTestId('beetle');

      act(() => {
        vi.advanceTimersByTime(4000);
      });

      expect(beetle).toHaveAttribute(
        'transform',
        expect.stringMatching(/^translate\(57\.4\d* /),
      );
    });
  });
});
