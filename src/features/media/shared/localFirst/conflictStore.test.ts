import { describe, it, expect, vi } from 'vitest'
import 'fake-indexeddb/auto';
import { createConflictStore } from './conflictStore';

function uniqueDbName() {
  return `conflict-store-test-${Math.random()}`;
}

const descriptionClash = {
  path: 'v2/work/t1/description',
  mine: 'mine',
  theirs: 'theirs',
};

describe('createConflictStore', () => {
  describe('adding a conflict', () => {
    it('lists it', async () => {
      const store = createConflictStore(uniqueDbName());

      await store.add([descriptionClash]);

      expect(store.list()).toEqual([descriptionClash]);
    });

    it('tells subscribers', async () => {
      const store = createConflictStore(uniqueDbName());
      const onChange = vi.fn();
      store.subscribe(onChange);

      await store.add([descriptionClash]);

      expect(onChange).toHaveBeenCalled();
    });

    describe('for a path that already has one', () => {
      it('replaces it', async () => {
        const store = createConflictStore(uniqueDbName());
        await store.add([descriptionClash]);

        await store.add([{ ...descriptionClash, theirs: 'newer' }]);

        expect(store.list()).toEqual([
          { ...descriptionClash, theirs: 'newer' },
        ]);
      });
    });
  });

  describe('removing a conflict', () => {
    it('stops listing it', async () => {
      const store = createConflictStore(uniqueDbName());
      const doneClash = { path: 'v2/work/t1/done', mine: true, theirs: false };
      await store.add([descriptionClash, doneClash]);

      await store.remove(descriptionClash.path);

      expect(store.list()).toEqual([doneClash]);
    });
  });

  describe('after a reload', () => {
    it('lists the conflicts that were saved', async () => {
      const dbName = uniqueDbName();
      await createConflictStore(dbName).add([descriptionClash]);
      const reloaded = createConflictStore(dbName);

      await reloaded.hydrate();

      expect(reloaded.list()).toEqual([descriptionClash]);
    });
  });
});
