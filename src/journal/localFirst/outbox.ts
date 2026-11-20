import { createStore, del, entries, promisifyRequest, set } from 'idb-keyval';

export type OutboxOp = {
  updates: Record<string, unknown>;
  editedAt?: number;
  itemCopies?: Record<string, unknown>;
};

export type StoredOutboxOp = OutboxOp & { id: number };

export type Outbox = {
  enqueue: (op: OutboxOp) => Promise<void>;
  list: () => Promise<StoredOutboxOp[]>;
  peekFront: () => Promise<StoredOutboxOp | undefined>;
  remove: (id: number) => Promise<void>;
  keepOnlyPathsUnder: (root: string) => Promise<void>;
};

export function createOutbox(dbName: string): Outbox {
  const store = createStore(dbName, 'outbox');

  async function list() {
    const all = (await entries(store)) as [number, OutboxOp][];
    return all.sort(([a], [b]) => a - b).map(([id, op]) => ({ id, ...op }));
  }

  return {
    enqueue(op) {
      return store('readwrite', (objectStore) => {
        const lastEntry = objectStore.openCursor(null, 'prev');
        lastEntry.onsuccess = () => {
          const lastId = (lastEntry.result?.key as number | undefined) ?? 0;
          objectStore.put(op, lastId + 1);
        };
        return promisifyRequest(objectStore.transaction);
      });
    },
    list,
    async peekFront() {
      const [front] = await list();
      return front;
    },
    async remove(id) {
      await del(id, store);
    },
    async keepOnlyPathsUnder(root) {
      const ops = await list();
      await Promise.all(
        ops.map(({ id, ...op }) => {
          const kept = Object.entries(op.updates).filter(([path]) =>
            path.startsWith(`${root}/`),
          );
          if (kept.length === Object.keys(op.updates).length) return undefined;
          return kept.length === 0
            ? del(id, store)
            : set(id, { ...op, updates: Object.fromEntries(kept) }, store);
        }),
      );
    },
  };
}
