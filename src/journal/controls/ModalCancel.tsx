import React from 'react';
import { useModal } from './ModalContext';

type ModalCancelProps = { children: React.ReactNode };

export function ModalCancel({ children }: ModalCancelProps) {
  const { closeModal } = useModal();

  return (
    <button className="outline" onClick={closeModal} type="button">
      {children}
    </button>
  );
}
