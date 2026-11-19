import { useEffect, useRef, useState } from 'react';

import './Switch.css';

type SwitchProps<T extends string> = {
  options: T[];
  value?: T;
  onChange: (value: T) => void;
  name: string;
  Option?: React.FC<{ value: T }>;
  className?: string;
};

export function Switch<T extends string>({
  options,
  value,
  onChange,
  name,
  Option,
  className,
}: SwitchProps<T>) {
  const radioGroupRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>();
  const [left, setLeft] = useState<number>();

  useEffect(() => {
    const radioGroup = radioGroupRef.current;
    if (!radioGroup) {
      return;
    }

    const positionIndicator = () => {
      const checkedOptionLabel = radioGroup
        .querySelector(`input[value="${value}"]`)
        ?.closest('label');
      if (!checkedOptionLabel) {
        return;
      }

      setWidth(checkedOptionLabel.clientWidth);
      const labelLeft = checkedOptionLabel.getBoundingClientRect().left;
      const parentLeft = radioGroup.getBoundingClientRect().left;
      setLeft(labelLeft - parentLeft - 1);
    };

    positionIndicator();

    const observer = new ResizeObserver(positionIndicator);
    observer.observe(radioGroup);
    return () => observer.disconnect();
  }, [value]);

  const borderRadiusLeft = value === options[0] ? 'inherit' : undefined;
  const borderRadiusRight =
    value === options[options.length - 1] ? 'inherit' : undefined;

  return (
    <div
      ref={radioGroupRef}
      role="radiogroup"
      className={`switch ${className ?? ''}`.trim()}
    >
      {options.map((option) => {
        return (
          <label key={option}>
            {Option ? <Option value={option} /> : option}
            <input
              type="radio"
              value={option}
              name={name}
              checked={value === option}
              onChange={() => onChange(option)}
            />
          </label>
        );
      })}
      {value !== undefined && (
        <div
          className="indicator"
          style={{
            width,
            left,
            borderTopLeftRadius: borderRadiusLeft,
            borderTopRightRadius: borderRadiusRight,
            borderBottomLeftRadius: borderRadiusLeft,
            borderBottomRightRadius: borderRadiusRight,
          }}
        />
      )}
    </div>
  );
}
