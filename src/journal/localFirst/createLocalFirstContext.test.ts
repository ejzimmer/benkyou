import { describe, it, expect, vi, beforeEach } from 'vitest'
import 'fake-indexeddb/auto';
import { renderHook, waitFor } from '@testing-library/react';
import { createLocalFirstContext } from './createLocalFirstContext';
import {
  fireRemoteSnapshot,
  flushMicrotasks,
  getMockServerData,
  getSentData,
  mockOnValueCallbacks,
  mockUpdate,
  resetMockDatabase,
  setMockServerData,
} from './firebaseDatabaseTestUtils';

vi.mock(
  'firebase/database',
  async () =>
    (await vi.importActual<typeof import('./firebaseDatabaseTestUtils')>('./firebaseDatabaseTestUtils')).firebaseDatabaseMock,
);

async function setUpContextWithStatus() {
  const { context, hydrate, saveStatus, conflictStatus } =
    createLocalFirstContext(
      {} as import('firebase/database').Database,
      `local-first-context-test-${Math.random()}`,
    );
  await hydrate();
  return { context, saveStatus, conflictStatus };
}

async function setUpContext() {
  return (await setUpContextWithStatus()).context;
}

beforeEach(() => {
  resetMockDatabase();
});

describe('createLocalFirstContext', () => {
  it('addItem writes locally immediately and is readable via useValue', async () => {
    const context = await setUpContext();

    const id = context.addItem<{ id: string; description: string }>('work', {
      description: 'Chores',
    });

    const { result } = renderHook(() =>
      context.useValue<Record<string, { description: string }>>('work'),
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.value?.[id!].description).toBe('Chores');
  });

  it('addItem enqueues a write op that the sync engine pushes to Firebase', async () => {
    const context = await setUpContext();

    const id = context.addItem<{ id: string; description: string }>('work', {
      description: 'Chores',
    });

    await waitFor(() => {
      expect(getSentData()).toContainEqual({
        [`v2/work/${id}`]: expect.objectContaining({ description: 'Chores' }),
      });
    });
  });

  it('deleteItem removes the item locally and syncs the deletion to the real database', async () => {
    const context = await setUpContext();
    const item = { id: 'task1', description: 'Chores' };
    context.updateItem('work', item);

    context.deleteItem('work', item);

    const { result } = renderHook(() =>
      context.useValue<Record<string, unknown>>('work'),
    );
    expect(result.current.value).toBeUndefined();

    await waitFor(() => {
      expect(getSentData()).toContainEqual({ 'v2/work/task1': null });
    });
  });

  it('ignores a write that matches what is already stored', async () => {
    const context = await setUpContext();
    const item = { id: 'task1', description: 'Chores' };
    context.updateItem('work', item);
    await flushMicrotasks();
    mockUpdate.mockClear();

    const { result } = renderHook(() =>
      context.useValue<Record<string, unknown>>('work'),
    );
    const storedBefore = result.current.value;

    context.updateItem('work', { ...item });
    await flushMicrotasks();

    expect(result.current.value).toBe(storedBefore);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('still writes a deletion for a value that is already gone', async () => {
    const context = await setUpContext();

    context.deleteItem('work', { id: 'task1', description: 'Chores' });

    await waitFor(() => {
      expect(getSentData()).toContainEqual({ 'v2/work/task1': null });
    });
  });

  it('setValue stores a bare primitive, not just objects', async () => {
    const context = await setUpContext();

    context.setValue('dailyReset', 12345);

    const { result } = renderHook(() => context.useValue<number>('dailyReset'));
    expect(result.current.value).toBe(12345);
  });

  it('setValues writes every path locally and syncs them as one atomic update', async () => {
    const context = await setUpContext();
    context.setValue('old', { a: 1 });

    context.setValues({ 'new/a': 1, old: null });

    const { result: moved } = renderHook(() =>
      context.useValue<Record<string, unknown>>('new'),
    );
    const { result: removed } = renderHook(() => context.useValue('old'));
    expect(moved.current.value).toEqual({ a: 1 });
    expect(removed.current.value).toBeUndefined();

    await waitFor(() => {
      expect(getSentData()).toContainEqual({
        'v2/new/a': 1,
        'v2/old': null,
      });
    });
  });

  it('applies a remote snapshot when nothing local is pending for that key', async () => {
    const context = await setUpContext();
    const { result } = renderHook(() =>
      context.useValue<Record<string, unknown>>('work'),
    );

    await waitFor(() => expect(mockOnValueCallbacks.has('v2/work')).toBe(true));

    fireRemoteSnapshot('v2/work', {
      task1: { id: 'task1', description: 'Remote' },
    });

    await waitFor(() => {
      expect(result.current.value).toEqual({
        task1: { id: 'task1', description: 'Remote' },
      });
    });
  });

  it('moveItemBetweenLists writes both lists locally and syncs as one atomic update', async () => {
    const context = await setUpContext();
    const movedItem = { id: 'task1', position: 0 };
    const stayingItem = { id: 'task2', position: 0 };
    context.updateItem('work/list2/items', stayingItem);

    context.moveItemBetweenLists({
      movedItem,
      sourceListId: 'work/list1/items',
      targetListId: 'work/list2/items',
      targetListItems: [stayingItem],
    });

    const { result: source } = renderHook(() =>
      context.useValue<Record<string, unknown>>('work/list1/items'),
    );
    const { result: target } = renderHook(() =>
      context.useValue<Record<string, unknown>>('work/list2/items'),
    );
    expect(source.current.value?.task1).toBeUndefined();
    expect(target.current.value?.task1).toEqual(movedItem);
    expect(target.current.value?.task2).toEqual({ id: 'task2', position: 1 });

    await waitFor(() => {
      expect(getSentData()).toContainEqual({
        'v2/work/list2/items/task1': movedItem,
        'v2/work/list1/items/task1': null,
        'v2/work/list2/items/task2/position': 1,
      });
    });
  });

  it('keeps an unsynced local write on top of a remote snapshot for that key', async () => {
    const context = await setUpContext();
    mockUpdate.mockImplementation(() => new Promise(() => {}));
    const item = { id: 'task1', description: 'Local edit' };

    context.updateItem('work', item);

    const { result } = renderHook(() =>
      context.useValue<Record<string, unknown>>('work'),
    );
    await waitFor(() => expect(mockOnValueCallbacks.has('v2/work')).toBe(true));

    fireRemoteSnapshot('v2/work', {
      task1: { id: 'task1', description: 'Stale' },
      task2: { id: 'task2', description: 'Added elsewhere' },
    });

    await waitFor(() => {
      expect(result.current.value).toEqual({
        task1: item,
        task2: { id: 'task2', description: 'Added elsewhere' },
      });
    });
  });

  describe('synced', () => {
    describe('before a remote snapshot has arrived', () => {
      it('is false, even when a value is cached locally', async () => {
        const context = await setUpContext();
        context.setValue('work', { task1: { id: 'task1' } });

        const { result } = renderHook(() => context.useValue('work'));

        expect(result.current.value).toEqual({ task1: { id: 'task1' } });
        expect(result.current.synced).toBe(false);
      });
    });

    describe('once a remote snapshot has arrived', () => {
      it('is true for that key', async () => {
        const context = await setUpContext();
        const { result } = renderHook(() => context.useValue('work'));
        await waitFor(() =>
          expect(mockOnValueCallbacks.has('v2/work')).toBe(true),
        );

        fireRemoteSnapshot('v2/work', {});

        await waitFor(() => expect(result.current.synced).toBe(true));
      });

      it('is true for keys nested under it', async () => {
        const context = await setUpContext();
        renderHook(() => context.useValue('work'));
        await waitFor(() =>
          expect(mockOnValueCallbacks.has('v2/work')).toBe(true),
        );
        const { result: nested } = renderHook(() =>
          context.useValue('work/list1'),
        );

        fireRemoteSnapshot('v2/work', {});

        await waitFor(() => expect(nested.current.synced).toBe(true));
      });
    });
  });

  describe('saving a change to an item that is already stored', () => {
    const project = {
      id: 'garden',
      description: 'Garden',
      status: 'ready',
      position: 0,
    };

    it('sends only the fields that changed', async () => {
      const context = await setUpContext();
      context.updateItem('projects', project);
      await flushMicrotasks();
      mockUpdate.mockClear();

      context.updateItem('projects', { ...project, status: 'done' });

      await waitFor(() =>
        expect(getSentData()).toContainEqual({
          'v2/projects/garden/status': 'done',
        }),
      );
    });

    describe('when a field is dropped from the item', () => {
      it('deletes the field', async () => {
        const context = await setUpContext();
        context.updateItem('projects', project);
        await flushMicrotasks();
        mockUpdate.mockClear();

        const { status, ...withoutStatus } = project;
        context.updateItem('projects', withoutStatus);

        await waitFor(() =>
          expect(getSentData()).toContainEqual({
            'v2/projects/garden/status': null,
          }),
        );
      });
    });

    describe('when a whole list is reordered', () => {
      it('sends only the positions that moved', async () => {
        const context = await setUpContext();
        const shed = { id: 'shed', description: 'Shed', position: 1 };
        context.updateList('projects', [project, shed]);
        await flushMicrotasks();
        mockUpdate.mockClear();

        context.updateList('projects', [
          { ...project, position: 1 },
          { ...shed, position: 0 },
        ]);

        await waitFor(() =>
          expect(getSentData()).toContainEqual({
            'v2/projects/garden/position': 1,
            'v2/projects/shed/position': 0,
          }),
        );
      });
    });
  });

  describe('when the server requires a newer app version', () => {
    it('reports the app as out of date', async () => {
      const { saveStatus } = await setUpContextWithStatus();

      fireRemoteSnapshot('minimumAppVersion', 3);

      expect(saveStatus.getSaveState()).toBe('outdated');
    });

    it('keeps saves on this device instead of sending them', async () => {
      const { context } = await setUpContextWithStatus();
      fireRemoteSnapshot('minimumAppVersion', 3);
      mockUpdate.mockClear();

      context.setValue('dailyReset', 12345);
      await flushMicrotasks();

      const { result } = renderHook(() => context.useValue('dailyReset'));
      expect(result.current.value).toBe(12345);
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('when the server allows this app version', () => {
    it('sends saves as usual', async () => {
      const { context, saveStatus } = await setUpContextWithStatus();
      fireRemoteSnapshot('minimumAppVersion', 2);

      context.setValue('dailyReset', 12345);

      expect(saveStatus.getSaveState()).toBe('saving');
      await waitFor(() =>
        expect(getSentData()).toContainEqual({ 'v2/dailyReset': 12345 }),
      );
    });
  });

  describe('when the server refuses a save', () => {
    it('reports saves as failing', async () => {
      const { context, saveStatus } = await setUpContextWithStatus();
      mockUpdate.mockRejectedValueOnce(new Error('PERMISSION_DENIED'));

      context.setValue('dailyReset', 12345);

      await waitFor(() => expect(saveStatus.getSaveState()).toBe('failing'));
    });

    describe('and a retry then succeeds', () => {
      it('reports saves as working again', async () => {
        const { context, saveStatus } = await setUpContextWithStatus();
        mockUpdate.mockRejectedValueOnce(new Error('PERMISSION_DENIED'));
        context.setValue('dailyReset', 12345);
        await waitFor(() => expect(saveStatus.getSaveState()).toBe('failing'));

        await waitFor(() => expect(saveStatus.getSaveState()).toBe('saving'), {
          timeout: 3000,
        });
      });
    });
  });

  describe('last edit wins', () => {
    const garden = {
      id: 'garden',
      description: 'Garden',
      status: 'ready',
      position: 0,
    };

    async function setUpWithStoredGarden() {
      const setUp = await setUpContextWithStatus();
      setUp.context.updateItem('projects', garden);
      await flushMicrotasks();
      mockUpdate.mockClear();
      return setUp;
    }

    function editAt(time: number, edit: () => void) {
      const now = vi.spyOn(Date, 'now').mockReturnValue(time);
      edit();
      now.mockRestore();
    }

    it('records when each field was edited', async () => {
      const { context } = await setUpWithStoredGarden();

      editAt(1000, () =>
        context.updateItem('projects', { ...garden, status: 'done' }),
      );

      await waitFor(() =>
        expect(mockUpdate).toHaveBeenCalledWith({
          'v2/projects/garden/status': 'done',
          'v2/_edited/projects/garden/status/_at': 1000,
        }),
      );
    });

    describe('when another device edited the same field earlier', () => {
      it('sends this edit', async () => {
        const { context } = await setUpWithStoredGarden();
        setMockServerData({
          v2: {
            projects: { garden: { ...garden, status: 'paused' } },
            _edited: { projects: { garden: { status: { _at: 500 } } } },
          },
        });

        editAt(1000, () =>
          context.updateItem('projects', { ...garden, status: 'done' }),
        );

        await waitFor(() =>
          expect(getSentData()).toContainEqual({
            'v2/projects/garden/status': 'done',
          }),
        );
      });
    });

    describe('when another device edited the same field later', () => {
      async function setUpClash() {
        const setUp = await setUpWithStoredGarden();
        setMockServerData({
          v2: {
            projects: { garden: { ...garden, status: 'paused' } },
            _edited: { projects: { garden: { status: { _at: 2000 } } } },
          },
        });
        editAt(1000, () =>
          setUp.context.updateItem('projects', { ...garden, status: 'done' }),
        );
        await waitFor(() =>
          expect(setUp.conflictStatus.listConflicts()).toHaveLength(1),
        );
        return setUp;
      }

      it('lists the clash with both versions and the item it belongs to', async () => {
        const { conflictStatus } = await setUpClash();

        expect(conflictStatus.listConflicts()).toEqual([
          {
            path: 'v2/projects/garden/status',
            mine: 'done',
            theirs: 'paused',
            item: { ...garden, status: 'done' },
          },
        ]);
      });

      it("shows the other device's version until a choice is made", async () => {
        const { context } = await setUpClash();

        const { result } = renderHook(() =>
          context.useValue<Record<string, { status: string }>>('projects'),
        );

        expect(result.current.value?.garden.status).toBe('paused');
      });

      describe('and this version is kept', () => {
        it('sends it again', async () => {
          const { conflictStatus } = await setUpClash();
          mockUpdate.mockClear();

          conflictStatus.keepMine('v2/projects/garden/status');

          await waitFor(() =>
            expect(getSentData()).toContainEqual({
              'v2/projects/garden/status': 'done',
            }),
          );
          expect(conflictStatus.listConflicts()).toEqual([]);
        });
      });

      describe("and the other device's version is kept", () => {
        it('clears the clash', async () => {
          const { conflictStatus } = await setUpClash();

          conflictStatus.keepTheirs('v2/projects/garden/status');

          expect(conflictStatus.listConflicts()).toEqual([]);
        });
      });
    });

    describe('when another device moved the same item later', () => {
      it('lists the clash with the list it was moved in', async () => {
        const { context, conflictStatus } = await setUpWithStoredGarden();
        const fence = { id: 'fence', description: 'Fence', position: 1 };
        context.updateItem('projects', fence);
        await flushMicrotasks();
        setMockServerData({
          v2: {
            projects: { garden: { ...garden, position: 2 }, fence },
            _edited: { projects: { garden: { position: { _at: 2000 } } } },
          },
        });

        editAt(1000, () =>
          context.updateItem('projects', { ...garden, position: 3 }),
        );

        await waitFor(() =>
          expect(conflictStatus.listConflicts()).toEqual([
            expect.objectContaining({
              path: 'v2/projects/garden/position',
              list: { garden: { ...garden, position: 3 }, fence },
            }),
          ]),
        );
      });
    });

    describe('when another device deleted the item later', () => {
      it('offers this whole item back', async () => {
        const { context, conflictStatus } = await setUpWithStoredGarden();
        setMockServerData({
          v2: {
            projects: {},
            _edited: { projects: { garden: { _at: 2000 } } },
          },
        });

        editAt(1000, () =>
          context.updateItem('projects', { ...garden, status: 'done' }),
        );

        await waitFor(() =>
          expect(conflictStatus.listConflicts()).toEqual([
            {
              path: 'v2/projects/garden',
              mine: { ...garden, status: 'done' },
              theirs: null,
              item: { ...garden, status: 'done' },
            },
          ]),
        );
      });
    });

    describe('when this device deletes an item edited later elsewhere', () => {
      it('lists the clash instead of deleting it', async () => {
        const { context, conflictStatus } = await setUpWithStoredGarden();
        setMockServerData({
          v2: {
            projects: { garden: { ...garden, status: 'paused' } },
            _edited: { projects: { garden: { status: { _at: 2000 } } } },
          },
        });

        editAt(1000, () => context.deleteItem('projects', garden));

        await waitFor(() =>
          expect(conflictStatus.listConflicts()).toEqual([
            {
              path: 'v2/projects/garden',
              mine: null,
              theirs: { ...garden, status: 'paused' },
            },
          ]),
        );
        expect(getSentData()).not.toContainEqual({
          'v2/projects/garden': null,
        });
      });
    });
  });

  describe('claiming a daily run', () => {
    describe('when no device has run the job today', () => {
      it('claims today on the server', async () => {
        const context = await setUpContext();
        setMockServerData({ v2: { today: { dailyReset: '2026-10-22' } } });

        const claimed = await context.claimDailyRun(
          'today/dailyReset',
          '2026-10-23',
        );

        expect(claimed).toBe(true);
        expect(getMockServerData()).toEqual({
          v2: { today: { dailyReset: '2026-10-23' } },
        });
      });

      it('reads back the claimed day', async () => {
        const context = await setUpContext();

        await context.claimDailyRun('today/dailyReset', '2026-10-23');

        const { result } = renderHook(() =>
          context.useValue<string>('today/dailyReset'),
        );
        expect(result.current.value).toBe('2026-10-23');
      });
    });

    describe('when another device has already run the job today', () => {
      it("doesn't claim it", async () => {
        const context = await setUpContext();
        setMockServerData({ v2: { today: { dailyReset: '2026-10-23' } } });

        const claimed = await context.claimDailyRun(
          'today/dailyReset',
          '2026-10-23',
        );

        expect(claimed).toBe(false);
      });
    });
  });
});
