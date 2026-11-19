import { useState } from 'react';
import { RubbishBinIcon } from '../icons/RubbishBin';

type DeleteWithConfirmationProps = {
  onDelete: () => void;
  className?: string;
  label?: string;
  confirmLabel?: string;
};

export function DeleteWithConfirmation({
  onDelete,
  className = '',
  label = 'Delete',
  confirmLabel = 'Confirm delete',
}: DeleteWithConfirmationProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <button
      type="button"
      className={`${className} delete ${isConfirming ? 'confirming' : ''}`}
      aria-label={isConfirming ? confirmLabel : label}
      onClick={() => (isConfirming ? onDelete() : setIsConfirming(true))}
      onBlur={() => setIsConfirming(false)}
    >
      <RubbishBinIcon />
    </button>
  );
}
