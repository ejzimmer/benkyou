import { Conflict } from '../localFirst/editTimes';
import { V2_ROOT } from '../localFirst/dataShape';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PUSH_ID = /^-[0-9A-Za-z_-]{19}$/;
const NAME_FIELDS = ['description', 'name', 'title', 'label'];

export function describeConflict(conflict: Conflict): string {
  const field = describeField(conflict.path);
  const itemName = findName(conflict.item);
  if (!field) return describeSection(conflict.path);
  if (!itemName || isNameField(conflict.path)) return field;
  return `${field} · ${itemName}`;
}

export function describeDeletion({
  mine,
  theirs,
}: Conflict): string | undefined {
  if (theirs === null) return 'Deleted on the other device';
  if (mine === null) return 'Deleted on this device';
  return undefined;
}

export function describeSection(path: string): string {
  return capitalise(getReadableSegments(path)[0] ?? '');
}

export function describeValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value !== 'object') return String(value);
  return findName(value) ?? 'Edited';
}

export function findName(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const record = value as Record<string, unknown>;
  const field = NAME_FIELDS.find((key) => typeof record[key] === 'string');
  return field && (record[field] as string);
}

function isId(segment: string): boolean {
  return UUID.test(segment) || PUSH_ID.test(segment);
}

function isNameField(path: string): boolean {
  return NAME_FIELDS.includes(path.split('/').pop() ?? '');
}

function describeField(path: string): string | undefined {
  const segments = path.split('/');
  const last = segments[segments.length - 1];
  if (isId(last) || segments.length <= 3) return undefined;
  return capitalise(last.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase());
}

function getReadableSegments(path: string): string[] {
  return path
    .slice(V2_ROOT.length + 1)
    .split('/')
    .filter((segment) => !isId(segment));
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
