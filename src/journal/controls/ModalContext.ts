import { createContext, useContext } from 'react';

export const ModalContext = createContext<
  { closeModal: () => void } | undefined
>(undefined);

export function useModal() {
  const context = useContext(ModalContext);

  if (!context) {
    throw new Error('Tried to access modal context outside of modal');
  }

  return context;
}
