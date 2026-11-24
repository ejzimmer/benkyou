import { InputHTMLAttributes } from 'react';

import './NumberInput.css';

type NumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'className'
>;

export function NumberInput(props: NumberInputProps) {
  return <input {...props} type="number" className="number-input" />;
}
