import { describe, it, expect, vi, beforeEach } from 'vitest'
import 'fake-indexeddb/auto';
import { createOutbox, Outbox } from './outbox';
import { createSyncEngine } from './syncEngine';

const mockUpdate = vi.fn().mockResolvedValue(undefined);

vi.mock('firebase/database', () => ({
  ref: (_database: unknown, path?: string) => ({ path }),
  update: (_reference: unknown, updates: Record<string, unknown>) =>
    mockUpdate(updates),
}));

function uniqueDbName() {
  return `sync-engine-test-${Math.random()}`;
}

function fakeDatabase() {
  return {} as import('firebase/database').Database;
}

// idb-keyval uses an implementation of setImmediate which doesn't work with
// Jest fakeTimer utils, so we need to do this the old fashioned way
async function flushMicrotasks() {
  for (let i = 0; i < 10; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe('createSyncEngine', () => {
  let outbox: Outbox;

  beforeEach(() => {
    outbox = createOutbox(uniqueDbName());
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true,
    });
  });

  it('drains a write op against the real database and removes it from the outbox', async () => {
    await outbox.enqueue({ updates: { 'work/list1': { id: 'list1' } } });
    const engine = createSyncEngine(fakeDatabase(), outbox);

    engine.startSyncing();
    await flushMicrotasks();

    expect(mockUpdate).toHaveBeenCalledWith({ 'work/list1': { id: 'list1' } });
    expect(await outbox.list()).toEqual([]);
  });

  it('drains multiple ops in order', async () => {
    await outbox.enqueue({ updates: { a: 1 } });
    await outbox.enqueue({ updates: { b: 2 } });
    const engine = createSyncEngine(fakeDatabase(), outbox);

    engine.startSyncing();
    await flushMicrotasks();

    expect(mockUpdate.mock.calls.map((call) => call[0])).toEqual([
      { a: 1 },
      { b: 2 },
    ]);
  });

  it('stops draining after a failure and leaves the op in the outbox', async () => {
    mockUpdate.mockRejectedValueOnce(new Error('offline'));
    await outbox.enqueue({ updates: { a: 1 } });
    await outbox.enqueue({ updates: { b: 2 } });
    const engine = createSyncEngine(fakeDatabase(), outbox);

    engine.startSyncing();
    await flushMicrotasks();

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect((await outbox.list()).map((op) => op.updates)).toEqual([
      { a: 1 },
      { b: 2 },
    ]);
  });

  it('drains a multi-write op as a single atomic update', async () => {
    const updates = { 'work/list1/task1': null, 'work/list2/task1': {} };
    await outbox.enqueue({ updates });
    const engine = createSyncEngine(fakeDatabase(), outbox);

    engine.startSyncing();
    await flushMicrotasks();

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith(updates);
    expect(await outbox.list()).toEqual([]);
  });

  it("doesn't attempt to drain while offline", async () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    });
    await outbox.enqueue({ updates: { a: 1 } });
    const engine = createSyncEngine(fakeDatabase(), outbox);

    engine.startSyncing();
    await flushMicrotasks();

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('only registers one online listener even if startSyncing is called twice', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const engine = createSyncEngine(fakeDatabase(), outbox);

    engine.startSyncing();
    engine.startSyncing();

    const onlineListenerCalls = addEventListenerSpy.mock.calls.filter(
      ([eventName]) => eventName === 'online',
    );
    expect(onlineListenerCalls).toHaveLength(1);

    addEventListenerSpy.mockRestore();
  });

  it('retries a failed op once notified again', async () => {
    mockUpdate.mockRejectedValueOnce(new Error('offline'));
    await outbox.enqueue({ updates: { a: 1 } });
    const engine = createSyncEngine(fakeDatabase(), outbox);

    engine.startSyncing();
    await flushMicrotasks();
    expect(mockUpdate).toHaveBeenCalledTimes(1);

    engine.notifyChange();
    await flushMicrotasks();

    expect(mockUpdate).toHaveBeenCalledTimes(2);
    expect(await outbox.list()).toEqual([]);
  });

  describe('when it is told it cannot sync', () => {
    it('keeps the queued saves until it can', async () => {
      await outbox.enqueue({ updates: { 'v2/a': 1 } });
      let canSync = false;
      const engine = createSyncEngine(fakeDatabase(), outbox, () => canSync);
      engine.startSyncing();
      await flushMicrotasks();
      const queued = await outbox.list();

      canSync = true;
      engine.notifyChange();
      await flushMicrotasks();

      expect(queued.map((op) => op.updates)).toEqual([{ 'v2/a': 1 }]);
      expect(mockUpdate).toHaveBeenCalledWith({ 'v2/a': 1 });
    });
  });

  describe('when saves are prepared before sending', () => {
    it('sends the prepared version', async () => {
      await outbox.enqueue({ updates: { 'v2/a': 1 }, editedAt: 5 });
      const engine = createSyncEngine(
        fakeDatabase(),
        outbox,
        undefined,
        undefined,
        async (op) => ({ ...op.updates, 'v2/_edited/a/_at': op.editedAt }),
      );

      engine.startSyncing();
      await flushMicrotasks();

      expect(mockUpdate).toHaveBeenCalledWith({
        'v2/a': 1,
        'v2/_edited/a/_at': 5,
      });
    });

    describe('and nothing is left to send', () => {
      it('clears the save from the queue and moves on to the next', async () => {
        await outbox.enqueue({ updates: { 'v2/a': 1 } });
        await outbox.enqueue({ updates: { 'v2/b': 2 } });
        const engine = createSyncEngine(
          fakeDatabase(),
          outbox,
          undefined,
          undefined,
          async (op) => ('v2/a' in op.updates ? {} : op.updates),
        );

        engine.startSyncing();
        await flushMicrotasks();

        expect(mockUpdate.mock.calls.map((call) => call[0])).toEqual([
          { 'v2/b': 2 },
        ]);
        expect(await outbox.list()).toEqual([]);
      });
    });
  });
});
