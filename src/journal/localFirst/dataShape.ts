export const V2_ROOT = 'v2';
export const APP_DATA_VERSION = 2;
export const MINIMUM_APP_VERSION_PATH = 'minimumAppVersion';

export type DataShape = {
  findStoredPath: (appPath: string) => string;
  convertStoredValue: (appPath: string, storedValue: unknown) => unknown;
  convertUpdates: (
    updates: Record<string, unknown>,
    readAppPath: (appPath: string) => unknown,
  ) => Record<string, unknown>;
};

export function createSubtreeDataShape(subtree: string): DataShape {
  const findPathInSubtree = (appPath: string) =>
    [V2_ROOT, subtree, appPath].filter(Boolean).join('/');

  return {
    findStoredPath: findPathInSubtree,
    convertStoredValue: (_appPath, storedValue) => storedValue,
    convertUpdates: (updates) =>
      Object.fromEntries(
        Object.entries(updates).map(([appPath, value]) => [
          findPathInSubtree(appPath),
          value ?? null,
        ]),
      ),
  };
}

export const PLAIN_DATA_SHAPE: DataShape = createSubtreeDataShape('');
