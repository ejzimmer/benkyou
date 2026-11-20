import { MediaTypeIcon } from './MediaTypeIcon';
import { MEDIA_TYPE_NAMES } from './names';
import { TooltipOption } from './TooltipOption';
import { MediaType } from './types';

type MediaTypeOptionProps = { value: MediaType };

export function MediaTypeOption({ value }: MediaTypeOptionProps) {
  return (
    <TooltipOption
      icon={<MediaTypeIcon type={value} width="34px" />}
      label={MEDIA_TYPE_NAMES[value]}
    />
  );
}
