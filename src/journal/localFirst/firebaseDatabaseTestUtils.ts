import { vi } from 'vitest'
type Snapshot = { val: () => unknown };

export const mockUpdate = vi.fn().mockResolvedValue(undefined);
export const mockOnValueCallbacks = new Map<
  string,
  (snapshot: Snapshot) => void
>();
let serverData: Record<string, unknown> = {};

export function getMockServerData() {
  return serverData;
}

export function setMockServerData(data: Record<string, unknown>) {
  serverData = data;
}

export function resetMockDatabase() {
  mockOnValueCallbacks.clear();
  serverData = {};
}

// Passed to vi.mock('firebase/database', ...) by suites that need it, via
// vi.importActual so the suite and the mock share these module-level maps.
export const firebaseDatabaseMock = {
  ref: (_database: unknown, path?: string) => ({ path }),
  update: (_reference: unknown, updates: Record<string, unknown>) =>
    mockUpdate(updates),
  get: async (reference: { path: string }) => ({
    val: () =>
      reference.path
        .split('/')
        .reduce<unknown>(
          (node, segment) => (node as Record<string, unknown>)?.[segment],
          serverData,
        ) ?? null,
  }),
  runTransaction: async (
    reference: { path: string },
    applyUpdate: (current: unknown) => unknown,
  ) => {
    const segments = reference.path.split('/');
    const parent = segments
      .slice(0, -1)
      .reduce<Record<string, unknown>>(
        (node, segment) => (node[segment] ??= {}) as Record<string, unknown>,
        serverData,
      );
    const key = segments[segments.length - 1];
    const next = applyUpdate(parent[key] ?? null);
    if (next === undefined) return { committed: false };
    parent[key] = next;
    return { committed: true };
  },
  onValue: (
    reference: { path: string },
    callback: (snapshot: Snapshot) => void,
  ) => {
    mockOnValueCallbacks.set(reference.path, callback);
    return () => mockOnValueCallbacks.delete(reference.path);
  },
};

export function getSentData() {
  return mockUpdate.mock.calls.map(([updates]) =>
    Object.fromEntries(
      Object.entries(updates as Record<string, unknown>).filter(
        ([path]) => !path.startsWith('v2/_edited/'),
      ),
    ),
  );
}

export function fireRemoteSnapshot(path: string, value: unknown) {
  mockOnValueCallbacks.get(path)?.({ val: () => value });
}

// idb-keyval uses an implementation of setImmediate which doesn't work with
// Jest fakeTimer utils, so we need to do this the old fashioned way
export async function flushMicrotasks() {
  for (let i = 0; i < 10; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
