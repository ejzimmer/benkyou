import { ReactNode, useState } from 'react';
import { SignChain } from './SignChain';

type HangingSignProps = {
  label: string;
  icon: ReactNode;
  onClick: () => void;
};

export function HangingSign({ label, icon, onClick }: HangingSignProps) {
  const [isSwinging, setIsSwinging] = useState(false);

  return (
    <div
      className={isSwinging ? 'hanging-sign swinging' : 'hanging-sign'}
      onAnimationEnd={() => setIsSwinging(false)}
    >
      <div className="sign-chains">
        <SignChain />
        <SignChain />
      </div>
      <button
        type="button"
        className="hanging-board"
        aria-label={label}
        onClick={() => {
          setIsSwinging(true);
          onClick();
        }}
      >
        {icon}
      </button>
    </div>
  );
}
