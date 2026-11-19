import { createStore, del, entries, set } from 'idb-keyval';
import { Conflict } from './editTimes';

type ConflictStore = {
  hydrate: () => Promise<void>;
  list: () => Conflict[];
  add: (conflicts: Conflict[]) => Promise<void>;
  remove: (path: string) => Promise<void>;
  subscribe: (onChange: () => void) => () => void;
};

export function createConflictStore(dbName: string): ConflictStore {
  const store = createStore(dbName, 'conflicts');
  const listeners = new Set<() => void>();
  let conflicts: Conflict[] = [];

  function replaceConflicts(next: Conflict[]) {
    conflicts = next;
    listeners.forEach((onChange) => onChange());
  }

  return {
    async hydrate() {
      const saved = (await entries(store)) as [string, Conflict][];
      replaceConflicts(saved.map(([, conflict]) => conflict));
    },
    list: () => conflicts,
    async add(added) {
      const addedPaths = new Set(added.map(({ path }) => path));
      replaceConflicts([
        ...conflicts.filter(({ path }) => !addedPaths.has(path)),
        ...added,
      ]);
      await Promise.all(
        added.map((conflict) => set(conflict.path, conflict, store)),
      );
    },
    async remove(path) {
      replaceConflicts(conflicts.filter((conflict) => conflict.path !== path));
      await del(path, store);
    },
    subscribe(onChange) {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
  };
}
