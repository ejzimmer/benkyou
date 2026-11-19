import { clear, createStore, get, set } from 'idb-keyval';
import { fetchCollection, Resource } from './api';

type CachedCollection<T> = {
  updatedAt: string | null;
  records: Record<number, T>;
};

const store = createStore('wanikani', 'collections');

export async function fetchCachedCollection<Raw, T>(
  path: string,
  apiKey: string,
  toRecord: (resource: Resource<Raw>) => T | undefined,
): Promise<T[]> {
  const cached = await get<CachedCollection<T>>(path, store);
  const query = cached?.updatedAt
    ? `?updated_after=${encodeURIComponent(cached.updatedAt)}`
    : '';
  const { updatedAt, resources } = await fetchCollection<Raw>(
    path + query,
    apiKey,
  );

  const records = { ...cached?.records };
  resources.forEach((resource) => {
    const record = toRecord(resource);
    if (record) {
      records[resource.id] = record;
    } else {
      delete records[resource.id];
    }
  });

  await set(
    path,
    { updatedAt: updatedAt ?? cached?.updatedAt ?? null, records },
    store,
  );
  return Object.values(records);
}

export function clearCachedCollections() {
  return clear(store);
}
