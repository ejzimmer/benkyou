import { LANGUAGE_FLAGS, LANGUAGE_NAMES } from './names';
import { TooltipOption } from './TooltipOption';
import { Language } from './types';

type LanguageOptionProps = { value: Language };

export function LanguageOption({ value }: LanguageOptionProps) {
  return (
    <TooltipOption
      icon={
        <span className="flag" aria-hidden="true">
          {LANGUAGE_FLAGS[value]}
        </span>
      }
      label={LANGUAGE_NAMES[value]}
    />
  );
}
