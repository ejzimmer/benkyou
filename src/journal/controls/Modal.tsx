import React from 'react';
import { JSX, useRef } from 'react';

import './Modal.css';
import { ModalContext } from './ModalContext';
import { ModalCloseButton } from './ModalCloseButton';
import { ModalAction } from './ModalAction';
import { ModalCancel } from './ModalCancel';

export type ModalProps = {
  trigger: (props: ModalTriggerProps) => JSX.Element;
  onClose?: () => void;
  children: React.ReactNode;
};

export type ModalTriggerProps = {
  onClick: () => void;
};

function Modal({ trigger: Trigger, onClose, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const openModal = () => {
    dialogRef.current?.showModal();
  };
  const closeModal = () => {
    dialogRef.current?.close();
  };

  return (
    <>
      <Trigger onClick={openModal} />
      <dialog
        ref={dialogRef}
        className="modal"
        // @ts-ignore closedby does exist really
        closedby="any"
        onClose={onClose}
      >
        <ModalContext.Provider value={{ closeModal }}>
          <div className="close-button">
            <ModalCloseButton />
          </div>
          {children}
        </ModalContext.Provider>
      </dialog>
    </>
  );
}

type ModalSectionProps = { children: React.ReactNode };

function Body({ children }: ModalSectionProps) {
  return <div>{children}</div>;
}

function Footer({ children }: ModalSectionProps) {
  return <div className="footer">{children}</div>;
}

Modal.Body = Body;
Modal.Footer = Footer;
Modal.Action = ModalAction;
Modal.Cancel = ModalCancel;
Modal.CloseButton = ModalCloseButton;

export { Modal };
