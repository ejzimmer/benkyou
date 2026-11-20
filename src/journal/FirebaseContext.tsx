import { createContext, useContext } from 'react';

type Item = { id: string };

export type ParentCrudFunction = <T extends Item>(
  parentId: string,
  item: T,
) => void;

export interface ContextType {
  addItem: <T>(parentName: string, item: Omit<T, 'id'>) => string | null;
  updateItem: ParentCrudFunction;
  deleteItem: ParentCrudFunction;
  updateList: <T extends Item>(listName: string, list: T[]) => void;
  setValue: <T>(path: string, value: T) => void;
  setValues: (updates: Record<string, unknown>) => void;
  claimDailyRun: (lastRunKey: string, day: string) => Promise<boolean>;
  useValue: <T>(key?: string) => {
    value?: T;
    loading: boolean;
    synced: boolean;
  };
  moveItemBetweenLists: <T extends { id: string; position: number }>(args: {
    movedItem: T;
    sourceListId: string;
    targetListId: string;
    targetListItems?: T[];
  }) => void;
}

export const FirebaseContext = createContext<ContextType | undefined>(
  undefined,
);

export function useStorageContext(): ContextType {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('Storage context not found');
  }

  return context;
}
