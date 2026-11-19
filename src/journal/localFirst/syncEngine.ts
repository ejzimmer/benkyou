import { Database, ref, update } from 'firebase/database';
import { Outbox, StoredOutboxOp } from './outbox';

const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;

type SyncEngine = {
  startSyncing: () => void;
  notifyChange: () => void;
};

export function createSyncEngine(
  database: Database,
  outbox: Outbox,
  canSync: () => boolean = () => true,
  onSendResult: (succeeded: boolean) => void = () => {},
  prepareUpdates: (
    op: StoredOutboxOp,
  ) => Promise<Record<string, unknown>> = async (op) => op.updates,
): SyncEngine {
  let draining = false;
  let syncing = false;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let backoffMs = INITIAL_BACKOFF_MS;

  async function drain() {
    if (draining) return;
    draining = true;

    try {
      while (navigator.onLine && canSync()) {
        const next = await outbox.peekFront();
        if (!next) return;

        try {
          const updates = await prepareUpdates(next);
          if (Object.keys(updates).length > 0) {
            await update(ref(database), updates);
          }
          await outbox.remove(next.id);
          backoffMs = INITIAL_BACKOFF_MS;
          onSendResult(true);
        } catch (error) {
          onSendResult(false);
          console.error(
            `Failed to sync ${JSON.stringify(next.updates)}, will retry`,
            error,
          );
          scheduleRetry();
          return;
        }
      }
    } finally {
      draining = false;
    }
  }

  function scheduleRetry() {
    if (retryTimer) return;
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
      void drain();
    }, backoffMs);
  }

  return {
    startSyncing() {
      if (syncing) return;
      syncing = true;

      void drain();
      window.addEventListener('online', () => {
        backoffMs = INITIAL_BACKOFF_MS;
        void drain();
      });
    },
    notifyChange() {
      if (syncing) void drain();
    },
  };
}
