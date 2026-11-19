import { XIcon } from '../icons/X';
import { useModal } from './ModalContext';

export function ModalCloseButton() {
  const { closeModal } = useModal();

  return (
    <button
      className="ghost"
      style={{
        color: 'inherit',
      }}
      aria-label="close modal"
      onClick={closeModal}
    >
      <XIcon width="16px" />
    </button>
  );
}
