import { describe, it, expect } from 'vitest'
import { diffOrders } from './diffOrders';

const describeChanges = (myOrder: string[], theirOrder: string[]) =>
  diffOrders(myOrder, theirOrder).map(
    ({ id, kind, position }) => `${kind} ${id} ${position + 1}`,
  );

describe('diffOrders', () => {
  describe('when the orders match', () => {
    it('keeps every item where it is', () => {
      expect(describeChanges(['a', 'b'], ['a', 'b'])).toEqual([
        'same a 1',
        'same b 2',
      ]);
    });
  });

  describe('when one item moved up', () => {
    it('shows it at its new and old positions, and the rest unchanged', () => {
      expect(
        describeChanges(['d', 'a', 'b', 'c'], ['a', 'b', 'c', 'd']),
      ).toEqual([
        'added d 1',
        'same a 2',
        'same b 3',
        'same c 4',
        'removed d 4',
      ]);
    });
  });

  describe('when two items moved', () => {
    it('shows both moves around the items that stayed put', () => {
      expect(
        describeChanges(
          ['journal', 'wash', 'stretch', 'laundry', 'duolingo'],
          ['stretch', 'wash', 'laundry', 'journal', 'duolingo'],
        ),
      ).toEqual([
        'added journal 1',
        'removed stretch 1',
        'same wash 2',
        'added stretch 3',
        'same laundry 4',
        'removed journal 4',
        'same duolingo 5',
      ]);
    });
  });

  describe('when an item is only in my order', () => {
    it('shows it as added', () => {
      expect(describeChanges(['a', 'new', 'b'], ['a', 'b'])).toEqual([
        'same a 1',
        'added new 2',
        'same b 3',
      ]);
    });
  });
});
