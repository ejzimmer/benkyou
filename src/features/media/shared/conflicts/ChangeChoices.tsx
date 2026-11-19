type ChangeChoicesProps = {
  className?: string;
  discardLabel: string;
  keepLabel: string;
  onDiscard: () => void;
  onKeep: () => void;
};

export function ChangeChoices({
  className = '',
  discardLabel,
  keepLabel,
  onDiscard,
  onKeep,
}: ChangeChoicesProps) {
  return (
    <div className={`conflict-actions ${className}`}>
      <button className="default" onClick={onDiscard}>
        {discardLabel}
      </button>
      <span aria-hidden="true">|</span>
      <button onClick={onKeep}>{keepLabel}</button>
    </div>
  );
}
