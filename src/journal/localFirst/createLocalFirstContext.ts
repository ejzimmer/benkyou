import { Database, get, onValue, ref, runTransaction } from 'firebase/database';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { ContextType } from '../FirebaseContext';
import { createConflictStore } from './conflictStore';
import {
  Conflict,
  createEditTimeUpdates,
  separateConflicts,
} from './editTimes';
import { findOrderedListPath } from './listOrder';
import { createLocalStore } from './localStore';
import { createOutbox, StoredOutboxOp } from './outbox';
import {
  getAtPath,
  getChangedFields,
  pathsAreRelated,
  setAtPath,
  Tree,
} from './pathTree';
import { createSyncEngine } from './syncEngine';
import {
  APP_DATA_VERSION,
  DataShape,
  MINIMUM_APP_VERSION_PATH,
  PLAIN_DATA_SHAPE,
  V2_ROOT,
} from './dataShape';
import { hasAlreadyRun } from '../dailyJobs/hasAlreadyRun';

export type SaveState = 'saving' | 'failing' | 'outdated';

export type SaveStatus = {
  subscribe: (onChange: () => void) => () => void;
  getSaveState: () => SaveState;
};

export type ConflictStatus = {
  subscribe: (onChange: () => void) => () => void;
  listConflicts: () => Conflict[];
  keepMine: (path: string) => void;
  keepTheirs: (path: string) => void;
};

export function createLocalFirstContext(
  database: Database,
  dbName: string,
  dataShape: DataShape = PLAIN_DATA_SHAPE,
): {
  context: ContextType;
  hydrate: () => Promise<void>;
  saveStatus: SaveStatus;
  conflictStatus: ConflictStatus;
} {
  const localStore = createLocalStore(`${dbName}-local`);
  const outbox = createOutbox(`${dbName}-outbox`);
  const conflictStore = createConflictStore(`${dbName}-conflicts`);
  const saveStatusListeners = new Set<() => void>();
  let isOutdated = false;
  let isFailing = false;
  const notifySaveStatus = () =>
    saveStatusListeners.forEach((onChange) => onChange());
  const syncEngine = createSyncEngine(
    database,
    outbox,
    () => !isOutdated,
    (succeeded) => {
      if (isFailing === !succeeded) return;
      isFailing = !succeeded;
      notifySaveStatus();
    },
    prepareUpdates,
  );
  void outbox.keepOnlyPathsUnder(V2_ROOT).then(() => syncEngine.startSyncing());

  onValue(ref(database, MINIMUM_APP_VERSION_PATH), (snapshot) => {
    isOutdated = Number(snapshot.val() ?? 0) > APP_DATA_VERSION;
    notifySaveStatus();
    syncEngine.notifyChange();
  });

  const keysWithRemoteListener = new Set<string>();
  const syncedKeys = new Set<string>();
  const syncListeners = new Set<() => void>();

  function isSynced(key: string) {
    return [...syncedKeys].some(
      (syncedKey) => key === syncedKey || key.startsWith(`${syncedKey}/`),
    );
  }

  function markSynced(key: string) {
    syncedKeys.add(key);
    syncListeners.forEach((onChange) => onChange());
  }

  function subscribeToSync(onChange: () => void) {
    syncListeners.add(onChange);
    return () => syncListeners.delete(onChange);
  }

  function registerRemoteListener(key: string) {
    if (keysWithRemoteListener.has(key)) {
      return;
    }
    keysWithRemoteListener.add(key);

    onValue(ref(database, key), async (snapshot) => {
      const pendingOps = await outbox.list();
      localStore.writePath(
        key,
        applyPendingOps(key, snapshot.val(), pendingOps),
      );
      markSynced(key);
    });
  }

  async function readServerPath(path: string) {
    return (await get(ref(database, path))).val();
  }

  async function prepareUpdates(op: StoredOutboxOp) {
    if (op.editedAt === undefined) return op.updates;

    const { kept, conflicts } = await separateConflicts(
      op.updates,
      op.editedAt,
      readServerPath,
      (path) => op.itemCopies?.[path] ?? localStore.readPath(path),
    );
    if (conflicts.length > 0) {
      const recordedConflicts = conflicts.map((conflict) =>
        recordConflict(conflict, op.itemCopies ?? {}),
      );
      conflicts.forEach(({ path, theirs }) =>
        localStore.writePath(path, theirs),
      );
      await conflictStore.add(recordedConflicts);
    }
    return { ...kept, ...createEditTimeUpdates(kept, op.editedAt) };
  }

  function recordConflict(
    conflict: Conflict,
    itemCopies: Record<string, unknown>,
  ): Conflict {
    const listPath = findOrderedListPath(conflict.path);
    return {
      ...conflict,
      item: findItemCopy(itemCopies, conflict.path),
      ...(listPath && { list: localStore.readPath(listPath) }),
    };
  }

  function commit(changes: [string, unknown][]) {
    changes.forEach(([path, value]) => localStore.writePath(path, value));
    void outbox
      .enqueue({
        updates: Object.fromEntries(changes),
        editedAt: Date.now(),
        itemCopies: findItemCopies(changes.map(([path]) => path)),
      })
      .then(() => syncEngine.notifyChange());
  }

  function findItemCopies(paths: string[]): Record<string, unknown> {
    return Object.fromEntries(
      paths.flatMap((path) => {
        const itemPath = findItemPath(path);
        return itemPath ? [[itemPath, localStore.readPath(itemPath)]] : [];
      }),
    );
  }

  function findItemCopy(itemCopies: Record<string, unknown>, path: string) {
    return Object.entries(itemCopies).find(
      ([itemPath]) => path === itemPath || path.startsWith(`${itemPath}/`),
    )?.[1];
  }

  function findItemPath(path: string): string | undefined {
    const segments = path.split('/');
    return segments
      .map((_, index) => segments.slice(0, segments.length - index).join('/'))
      .find((candidate) => {
        const value = localStore.readPath<Tree>(candidate);
        return (
          typeof value === 'object' &&
          value !== null &&
          value.id === candidate.split('/').pop()
        );
      });
  }

  function readAppPath(path: string) {
    return dataShape.convertStoredValue(
      path,
      localStore.readPath(dataShape.findStoredPath(path)),
    );
  }

  function write(updates: Record<string, unknown>) {
    const storedUpdates = dataShape.convertUpdates(updates, (unitPath) =>
      readAppPathWithUpdates(unitPath, readAppPath(unitPath), updates),
    );
    const changes = Object.entries(storedUpdates).flatMap(([path, value]) =>
      value === null
        ? [[path, null] as [string, unknown]]
        : getChangedFields(path, localStore.readPath(path), value),
    );
    if (changes.length > 0) {
      commit(changes);
    }
  }

  function findConflict(path: string) {
    return conflictStore.list().find((conflict) => conflict.path === path);
  }

  const context: ContextType = {
    addItem: (parent, item) => {
      const id = crypto.randomUUID();
      write({ [`${parent}/${id}`]: { ...item, id } });
      return id;
    },
    updateItem: (parent, item) => {
      const path = item.id ? `${parent}/${item.id}` : parent;
      write({ [path]: item });
    },
    deleteItem: (parent, item) => {
      if (!item.id) {
        console.error(
          `deleteItem called with no id, refusing to delete under "${parent}"`,
          item,
        );
        return;
      }
      write({ [`${parent}/${item.id}`]: null });
    },
    updateList: (listName, list) => {
      const map = list.reduce(
        (items, item) => {
          items[item.id] = item;
          return items;
        },
        {} as Record<string, unknown>,
      );
      write({ [listName]: map });
    },
    setValue: (path, value) => {
      write({ [path]: value });
    },
    setValues: write,
    claimDailyRun: async (lastRunKey, day) => {
      const path = dataShape.findStoredPath(lastRunKey);
      const { committed } = await runTransaction(
        ref(database, path),
        (lastRun) => (hasAlreadyRun(lastRun, day) ? undefined : day),
      );
      if (committed) localStore.writePath(path, day);
      return committed;
    },
    moveItemBetweenLists: ({
      movedItem,
      sourceListId,
      targetListId,
      targetListItems = [],
    }) => {
      const updates: Record<string, unknown> = {
        [`${targetListId}/${movedItem.id}`]: movedItem,
        [`${sourceListId}/${movedItem.id}`]: null,
      };
      targetListItems.forEach((existingItem) => {
        updates[`${targetListId}/${existingItem.id}/position`] =
          existingItem.position < movedItem.position
            ? existingItem.position
            : existingItem.position + 1;
      });
      write(updates);
    },
    useValue: <T>(key?: string) => {
      const sourceKey = key && dataShape.findStoredPath(key);

      useEffect(() => {
        if (sourceKey) registerRemoteListener(sourceKey);
      }, [sourceKey]);

      const sourceValue = useSyncExternalStore(
        (onChange) =>
          sourceKey ? localStore.subscribe(sourceKey, onChange) : () => {},
        () => (sourceKey ? localStore.readPath(sourceKey) : undefined),
      );
      const value = useMemo(
        () =>
          key ? dataShape.convertStoredValue(key, sourceValue) : undefined,
        [key, sourceValue],
      ) as T | undefined;
      const synced = useSyncExternalStore(subscribeToSync, () =>
        sourceKey ? isSynced(sourceKey) : false,
      );

      return { value, loading: false, synced };
    },
  };

  return {
    context,
    hydrate: async () => {
      await Promise.all([localStore.hydrate(), conflictStore.hydrate()]);
    },
    conflictStatus: {
      subscribe: conflictStore.subscribe,
      listConflicts: conflictStore.list,
      keepMine: (path) => {
        const conflict = findConflict(path);
        if (!conflict) return;
        commit([[path, conflict.mine ?? null]]);
        void conflictStore.remove(path);
      },
      keepTheirs: (path) => {
        const conflict = findConflict(path);
        if (!conflict) return;
        localStore.writePath(path, conflict.theirs);
        void conflictStore.remove(path);
      },
    },
    saveStatus: {
      subscribe: (onChange) => {
        saveStatusListeners.add(onChange);
        return () => saveStatusListeners.delete(onChange);
      },
      getSaveState: () =>
        isOutdated ? 'outdated' : isFailing ? 'failing' : 'saving',
    },
  };
}

function readAppPathWithUpdates(
  unitPath: string,
  currentValue: unknown,
  updates: Record<string, unknown>,
): unknown {
  const tree = Object.entries(updates)
    .filter(([path]) => pathsAreRelated(path, unitPath))
    .reduce<Tree>(
      (tree, [path, value]) => setAtPath(tree, path, value),
      setAtPath({}, unitPath, currentValue),
    );

  return getAtPath(tree, unitPath);
}

function applyPendingOps(
  key: string,
  remoteValue: unknown,
  pendingOps: StoredOutboxOp[],
): unknown {
  const tree = pendingOps
    .flatMap((op) => Object.entries(op.updates))
    .filter(([path]) => pathsAreRelated(path, key))
    .reduce<Tree>(
      (tree, [path, value]) => setAtPath(tree, path, value),
      setAtPath({}, key, remoteValue),
    );

  return getAtPath(tree, key);
}
