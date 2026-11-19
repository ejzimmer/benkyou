import { describe, it, expect, vi } from 'vitest'
import 'fake-indexeddb/auto';
import { createLocalStore } from './localStore';

function createUniqueDbName() {
  return `local-store-test-${Math.random()}`;
}

describe('createLocalStore', () => {
  describe('readPath', () => {
    it('is undefined for a path that was never written', async () => {
      const store = createLocalStore(createUniqueDbName());
      await store.hydrate();
      expect(store.readPath('missing')).toBeUndefined();
    });

    it('returns a write immediately, without waiting on persistence', async () => {
      const store = createLocalStore(createUniqueDbName());
      await store.hydrate();

      store.writePath('work/list1', { id: 'list1', description: 'Chores' });

      expect(store.readPath('work/list1')).toEqual({
        id: 'list1',
        description: 'Chores',
      });
    });
  });

  describe('when a path is written', () => {
    it('notifies a subscriber to an ancestor of the written path', async () => {
      const store = createLocalStore(createUniqueDbName());
      await store.hydrate();
      const onChange = vi.fn();
      store.subscribe('work', onChange);

      store.writePath('work/list1', { id: 'list1' });

      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it("doesn't notify a subscriber to an unrelated path", async () => {
      const store = createLocalStore(createUniqueDbName());
      await store.hydrate();
      const onChange = vi.fn();
      store.subscribe('labels', onChange);

      store.writePath('work/list1', { id: 'list1' });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('stops notifying after unsubscribing', async () => {
      const store = createLocalStore(createUniqueDbName());
      await store.hydrate();
      const onChange = vi.fn();
      const unsubscribe = store.subscribe('work', onChange);
      unsubscribe();

      store.writePath('work/list1', { id: 'list1' });

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('when writes are persisted', () => {
    it('rehydrates them in a fresh instance', async () => {
      const dbName = createUniqueDbName();
      const store1 = createLocalStore(dbName);
      await store1.hydrate();
      store1.writePath('work/list1', { id: 'list1', description: 'Chores' });

      await new Promise((resolve) => setTimeout(resolve, 0));

      const store2 = createLocalStore(dbName);
      await store2.hydrate();
      expect(store2.readPath('work/list1')).toEqual({
        id: 'list1',
        description: 'Chores',
      });
    });
  });
});
