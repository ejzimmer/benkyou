import { CallistemonFlowerIcon } from './CallistemonFlowerIcon';
import { SaguaroBlossomIcon } from './SaguaroBlossomIcon';
import { SakuraFlowerIcon } from './SakuraFlowerIcon';
import { WisteriaRacemeIcon } from './WisteriaRacemeIcon';
import { MediaType } from './types';

const ICONS = {
  book: CallistemonFlowerIcon,
  manga: SakuraFlowerIcon,
  youtube: SaguaroBlossomIcon,
  tv: WisteriaRacemeIcon,
};

type MediaTypeIconProps = {
  type: MediaType;
  width?: string;
};

export function MediaTypeIcon({ type, width }: MediaTypeIconProps) {
  const Icon = ICONS[type];
  return <Icon width={width} />;
}
