import { Episode, PrintSeries, Season, TvSeries, Volume } from './types';

const minutesAndSecondsFormat = new Intl.DurationFormat(undefined, {
  style: 'digital',
  hoursDisplay: 'auto',
});

const toDuration = (totalSeconds: number) =>
  Temporal.Duration.from({ seconds: totalSeconds }).round({
    largestUnit: 'hours',
  });

export const formatMinutesAndSeconds = (totalSeconds: number) =>
  minutesAndSecondsFormat.format(toDuration(totalSeconds));

export const formatEpisodeName = ({ number, name }: Episode) =>
  name || `Episode ${number}`;

export const formatEpisodeTitle = (
  series: TvSeries,
  season: Season,
  episode: Episode,
) => episode.name || `${series.name} ${season.number}-${episode.number}`;

export const formatVolumeName = ({ number, name }: Volume) =>
  name || `Volume ${number}`;

export function formatVolumeTitle(
  series: PrintSeries,
  { number, name }: Volume,
) {
  if (series.type === 'book' && name) {
    return name;
  }
  const volumeNumber =
    series.language === 'japanese' ? toFullWidthDigits(number) : number;
  return `${series.name} ${volumeNumber}${name ? `: ${name}` : ''}`;
}

const FULL_WIDTH_OFFSET = 0xfee0;

const toFullWidthDigits = (number: number) =>
  String(number).replace(/\d/g, (digit) =>
    String.fromCharCode(digit.charCodeAt(0) + FULL_WIDTH_OFFSET),
  );
