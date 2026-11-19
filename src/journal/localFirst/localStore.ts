import { createStore, get, set } from 'idb-keyval';
import { getAtPath, pathsAreRelated, setAtPath, Tree } from './pathTree';

const ROOT_KEY = 'tree';

type LocalStore = {
  hydrate: () => Promise<void>;
  readPath: <T>(path: string) => T | undefined;
  writePath: (path: string, value: unknown) => void;
  subscribe: (key: string, onChange: () => void) => () => void;
};

export function createLocalStore(dbName: string): LocalStore {
  const store = createStore(dbName, 'root');
  const listeners = new Map<string, Set<() => void>>();
  let data: Tree = {};

  function notify(changedPath: string) {
    listeners.forEach((subscribers, key) => {
      if (pathsAreRelated(key, changedPath)) {
        subscribers.forEach((onChange) => onChange());
      }
    });
  }

  return {
    async hydrate() {
      const saved = await get<Tree>(ROOT_KEY, store);
      data = saved ?? {};
    },
    readPath<T>(path: string) {
      return getAtPath(data, path) as T | undefined;
    },
    writePath(path, value) {
      data = setAtPath(data, path, value);
      void set(ROOT_KEY, data, store);
      notify(path);
    },
    subscribe(key, onChange) {
      if (!listeners.has(key)) listeners.set(key, new Set());
      listeners.get(key)!.add(onChange);
      return () => listeners.get(key)?.delete(onChange);
    },
  };
}
