import React from 'react';
import { useModal } from './ModalContext';

type ModalActionProps = React.HTMLAttributes<HTMLButtonElement>;

export function ModalAction({ onClick, ...props }: ModalActionProps) {
  const { closeModal } = useModal();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) {
      event.preventDefault();
      onClick(event);
      closeModal();
    }
  };
  return <button {...props} onClick={handleClick} />;
}
