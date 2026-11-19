import { valuesAreEqual } from './pathTree';
import { V2_ROOT } from './dataShape';

const EDITED_ROOT = `${V2_ROOT}/_edited`;
const EDIT_TIME_KEY = '_at';

export type Conflict = {
  path: string;
  mine: unknown;
  theirs: unknown;
  item?: unknown;
  list?: unknown;
};

type ReadServerPath = (path: string) => Promise<unknown>;

export function createEditTimeUpdates(
  updates: Record<string, unknown>,
  editedAt: number,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(updates)
      .filter(([path]) => isDataPath(path))
      .map(([path, value]) =>
        value === null
          ? [`${findEditTimesPath(path)}`, { [EDIT_TIME_KEY]: editedAt }]
          : [`${findEditTimesPath(path)}/${EDIT_TIME_KEY}`, editedAt],
      ),
  );
}

export async function separateConflicts(
  updates: Record<string, unknown>,
  editedAt: number,
  readServerPath: ReadServerPath,
  findMyCopy: (path: string) => unknown,
): Promise<{ kept: Record<string, unknown>; conflicts: Conflict[] }> {
  const results = await Promise.all(
    Object.entries(updates).map(async ([path, value]) => ({
      path,
      value,
      conflict: isDataPath(path)
        ? await findConflict(path, value, editedAt, readServerPath, findMyCopy)
        : undefined,
    })),
  );

  const kept = Object.fromEntries(
    results
      .filter(({ conflict }) => !conflict)
      .map(({ path, value }) => [path, value]),
  );
  const conflictsByPath = new Map(
    results.flatMap(({ conflict }) =>
      conflict && !valuesAreEqual(conflict.mine, conflict.theirs)
        ? [[conflict.path, conflict] as const]
        : [],
    ),
  );
  return { kept, conflicts: [...conflictsByPath.values()] };
}

async function findConflict(
  path: string,
  value: unknown,
  editedAt: number,
  readServerPath: ReadServerPath,
  findMyCopy: (path: string) => unknown,
): Promise<Conflict | undefined> {
  const pathsDownToThis = getPathsDownTo(path);
  const editTimes = await Promise.all(
    pathsDownToThis.map((candidate) =>
      readServerPath(`${findEditTimesPath(candidate)}/${EDIT_TIME_KEY}`),
    ),
  );
  const newerIndex = editTimes.findIndex(
    (time) => typeof time === 'number' && time > editedAt,
  );

  if (newerIndex >= 0) {
    const newerPath = pathsDownToThis[newerIndex];
    const theirs = await readServerPath(newerPath);
    if (newerPath !== path && theirs == null) {
      return { path: newerPath, mine: findMyCopy(newerPath), theirs: null };
    }
    return { path, mine: value, theirs: await readServerPath(path) };
  }

  if (value === null) {
    const editTimesBelow = await readServerPath(findEditTimesPath(path));
    if (getEditTimes(editTimesBelow).some((time) => time > editedAt)) {
      return { path, mine: null, theirs: await readServerPath(path) };
    }
  }

  return undefined;
}

function isDataPath(path: string): boolean {
  return path.startsWith(`${V2_ROOT}/`) && !path.startsWith(`${EDITED_ROOT}/`);
}

function findEditTimesPath(dataPath: string): string {
  return `${EDITED_ROOT}/${dataPath.slice(V2_ROOT.length + 1)}`;
}

function getPathsDownTo(path: string): string[] {
  const segments = path.split('/');
  return segments
    .slice(1)
    .map((_, index) => segments.slice(0, index + 2).join('/'));
}

function getEditTimes(tree: unknown): number[] {
  if (typeof tree !== 'object' || tree === null) return [];
  return Object.entries(tree).flatMap(([key, child]) =>
    key === EDIT_TIME_KEY && typeof child === 'number'
      ? [child]
      : getEditTimes(child),
  );
}
