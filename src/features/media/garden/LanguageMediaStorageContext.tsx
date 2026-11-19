import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { useStorageContext } from '../../../journal/FirebaseContext';
import { getThisYear } from '../../../journal/dates';
import { createInitialChildren, createMediaDetails } from './createMedia';
import { getItemsInAddedOrder } from './lists';
import {
  getLanguageMediaPath,
  ItemPath,
  LANGUAGE_MEDIA_PATH,
  LanguageMedia,
  NewMedia,
  StoredMediaByYear,
} from './types';

export type LanguageMediaYearStorage = {
  year: number;
  media: LanguageMedia[];

  addMedia: (media: NewMedia) => void;
  addItem: (collection: ItemPath, item: object) => string | null;
  updateItem: (item: ItemPath, changes: object) => void;
  deleteItem: (item: ItemPath) => void;
};

export type LanguageMediaStorageContextType = {
  years: number[];
  thisYear: number;
  selectedYear: number;
  isLoading: boolean;
  selectYear: (year: number) => void;
  getMediaYear: (year: number) => LanguageMediaYearStorage;
};

export const LanguageMediaStorageContext = createContext<
  LanguageMediaStorageContextType | undefined
>(undefined);

const getCurrentTime = () => Temporal.Now.instant().toString();

const findStoredItem = (
  media: Record<string, LanguageMedia> | undefined,
  itemPath: ItemPath,
) =>
  itemPath.reduce<Record<string, unknown> | undefined>(
    (node, key) => node?.[key] as Record<string, unknown> | undefined,
    media,
  );

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isSameValue = (stored: unknown, value: unknown): boolean => {
  if (isObject(stored) && isObject(value)) {
    const keys = new Set([...Object.keys(stored), ...Object.keys(value)]);
    return [...keys].every((key) => isSameValue(stored[key], value[key]));
  }
  return (stored ?? null) === (value ?? null);
};

const removeUndefinedFields = (item: object) =>
  Object.fromEntries(
    Object.entries(item).filter(([, value]) => value !== undefined),
  );

const sortYearsByNewest = (
  thisYear: number,
  storedMediaByYear?: StoredMediaByYear,
) =>
  [
    ...new Set([thisYear, ...Object.keys(storedMediaByYear ?? {}).map(Number)]),
  ].sort((a, b) => b - a);

type LanguageMediaStorageProviderProps = {
  children: ReactNode;
};

export function LanguageMediaStorageProvider({
  children,
}: LanguageMediaStorageProviderProps) {
  const { addItem, deleteItem, setValues, useValue } = useStorageContext();
  const { value: storedMediaByYear, loading } =
    useValue<StoredMediaByYear>(LANGUAGE_MEDIA_PATH);
  const thisYear = getThisYear();
  const [selectedYear, selectYear] = useState(thisYear);

  const mediaYears = useMemo(() => {
    const createMediaYear = (year: number): LanguageMediaYearStorage => {
      const toPath = (itemPath: ItemPath) =>
        [getLanguageMediaPath(year), ...itemPath].join('/');

      const addMediaItem = (collection: ItemPath, item: object) =>
        addItem(toPath(collection), {
          ...removeUndefinedFields(item),
          createdAt: getCurrentTime(),
        });

      return {
        year,
        media: getItemsInAddedOrder(storedMediaByYear?.[year]),

        addMedia: (newMedia) => {
          const id = addMediaItem([], createMediaDetails(newMedia));
          if (!id) return;

          const { collection, children } = createInitialChildren(newMedia);
          children.forEach((child) => addMediaItem([id, collection], child));
        },
        addItem: addMediaItem,
        updateItem: (itemPath, changes) => {
          const storedItem = findStoredItem(
            storedMediaByYear?.[year],
            itemPath,
          );
          const changedFields = Object.entries(changes).filter(
            ([field, value]) => !isSameValue(storedItem?.[field], value),
          );
          if (changedFields.length === 0) return;

          setValues(
            Object.fromEntries(
              changedFields.map(([field, value]) => [
                toPath([...itemPath, field]),
                value ?? null,
              ]),
            ),
          );
        },
        deleteItem: (itemPath) =>
          deleteItem(toPath(itemPath.slice(0, -1)), { id: itemPath.at(-1)! }),
      };
    };

    const years = sortYearsByNewest(thisYear, storedMediaByYear);
    const mediaByYear = new Map(
      years.map((year) => [year, createMediaYear(year)]),
    );

    return {
      years,
      getMediaYear: (year: number) =>
        mediaByYear.get(year) ?? createMediaYear(year),
    };
  }, [thisYear, storedMediaByYear, addItem, deleteItem, setValues]);

  const value = useMemo(
    () => ({
      ...mediaYears,
      thisYear,
      selectedYear,
      selectYear,
      isLoading: loading,
    }),
    [mediaYears, thisYear, selectedYear, loading],
  );

  return (
    <LanguageMediaStorageContext.Provider value={value}>
      {children}
    </LanguageMediaStorageContext.Provider>
  );
}

export function useLanguageMediaStorageContext(): LanguageMediaStorageContextType {
  const context = useContext(LanguageMediaStorageContext);
  if (!context) {
    throw new Error('missing LanguageMediaStorageContext provider');
  }
  return context;
}

export function useLanguageMediaStorage(): LanguageMediaYearStorage {
  const { getMediaYear, selectedYear } = useLanguageMediaStorageContext();
  return getMediaYear(selectedYear);
}
