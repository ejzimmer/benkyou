import { useState } from 'react';
import { ModalDialog } from '../../../journal/controls/ModalDialog';
import { Tooltip } from '../../../journal/controls/Tooltip';
import { AddMediaForm } from './AddMediaForm';
import { CloudFrame } from './CloudFrame';
import { SeedlingIcon } from './SeedlingIcon';

export function AddMediaButton() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Tooltip label="Add media" position="top">
        {(triggerProps) => (
          <button
            {...triggerProps}
            type="button"
            className="add-media-button"
            aria-label="Add media"
            aria-expanded={isOpen}
            onClick={() => setIsOpen(true)}
          >
            <SeedlingIcon width="56px" />
          </button>
        )}
      </Tooltip>
      <ModalDialog
        isOpen={isOpen}
        className="progress-update-modal add-media-modal"
        onCancel={() => setIsOpen(false)}
      >
        {isOpen && (
          <CloudFrame>
            <AddMediaForm />
          </CloudFrame>
        )}
      </ModalDialog>
    </>
  );
}
