const POSITION_FIELD = 'position';

export function findOrderedListPath(path: string): string | undefined {
  const segments = path.split('/');
  if (segments[segments.length - 1] !== POSITION_FIELD) return undefined;
  return segments.slice(0, -2).join('/');
}

export function findPositionItemId(path: string): string {
  const segments = path.split('/');
  return segments[segments.length - 2];
}
