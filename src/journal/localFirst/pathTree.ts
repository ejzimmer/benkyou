export type Tree = Record<string, unknown>;

export function getAtPath(root: Tree, path: string): unknown {
  return path
    .split('/')
    .reduce<unknown>(
      (node, segment) => (node as Tree | undefined)?.[segment],
      root,
    );
}

export function setAtPath(root: Tree, path: string, value: unknown): Tree {
  const segments = path.split('/');
  const last = segments.pop()!;

  const chain: Tree[] = [root];
  for (const segment of segments) {
    const child = chain[chain.length - 1][segment];
    chain.push(
      typeof child === 'object' && child !== null ? (child as Tree) : {},
    );
  }

  const isDelete = value === undefined || value === null;
  let node = { ...chain[chain.length - 1] };
  if (isDelete) {
    delete node[last];
  } else {
    node[last] = value;
  }

  for (let i = segments.length - 1; i >= 0; i--) {
    const parent = { ...chain[i] };
    if (isDelete && Object.keys(node).length === 0) {
      delete parent[segments[i]];
    } else {
      parent[segments[i]] = node;
    }
    node = parent;
  }

  return node;
}

export function valuesAreEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (
    typeof a !== 'object' ||
    typeof b !== 'object' ||
    a === null ||
    b === null
  ) {
    return false;
  }

  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  return (
    aKeys.length === bKeys.length &&
    aKeys.every((key) => valuesAreEqual((a as Tree)[key], (b as Tree)[key]))
  );
}

export function pathsAreRelated(a: string, b: string): boolean {
  return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
}

export function getChangedFields(
  path: string,
  current: unknown,
  next: unknown,
): [string, unknown][] {
  if (next === null || next === undefined) {
    return current === undefined ? [] : [[path, null]];
  }
  if (isPlainTree(current) && isPlainTree(next)) {
    const keys = new Set([...Object.keys(current), ...Object.keys(next)]);
    return [...keys].flatMap((key) =>
      getChangedFields(`${path}/${key}`, current[key], next[key]),
    );
  }
  return valuesAreEqual(current, next) ? [] : [[path, next]];
}

export function isPlainTree(value: unknown): value is Tree {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
