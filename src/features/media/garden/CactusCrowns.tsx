import { formatDayAndMonth, getLocalDate } from '../shared/dates';
import { HoverCloud } from './HoverCloud';
import { placeCrowns } from './placeCrowns';
import { SaguaroCrown } from './SaguaroCrown';
import { GrownShape } from './treeGrowth';
import { Video, YoutubeChannel } from './types';

type CactusCrownsProps = {
  channel: YoutubeChannel;
  shapes: GrownShape[];
  onSelect: (video: Video) => void;
};

export function CactusCrowns({ channel, shapes, onSelect }: CactusCrownsProps) {
  return (
    <g className="cactus-crowns">
      {placeCrowns(channel, shapes).map((spot) => (
        <HoverCloud
          key={spot.key}
          text={spot.date && formatDayAndMonth(getLocalDate(spot.date))}
          onClick={() => onSelect(spot.video)}
        >
          <SaguaroCrown spot={spot} />
        </HoverCloud>
      ))}
    </g>
  );
}
