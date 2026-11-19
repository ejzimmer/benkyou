import { useEffect } from 'react';
import { Skeleton } from '../../../journal/controls/Skeleton';
import { InvalidApiKeyError } from './api';
import { GemDefs } from './GemDefs';
import { LevelGems } from './LevelGems';
import { CurrentLevel } from './CurrentLevel';
import { SrsProgress } from './SrsProgress';
import { useWaniKaniData } from './useWaniKaniData';
import './WaniKaniStatus.css';

type WaniKaniProgressProps = {
  apiKey: string;
  onInvalidApiKey: () => void;
};

export function WaniKaniProgress({
  apiKey,
  onInvalidApiKey,
}: WaniKaniProgressProps) {
  const { data, error } = useWaniKaniData(apiKey);
  const isApiKeyInvalid = error instanceof InvalidApiKeyError;

  useEffect(() => {
    if (isApiKeyInvalid) onInvalidApiKey();
  }, [isApiKeyInvalid, onInvalidApiKey]);

  if (isApiKeyInvalid) {
    return null;
  }
  if (error) {
    return <div className="wanikani-status">Couldn't load WaniKani data</div>;
  }
  if (!data) {
    return <Skeleton numRows={3} />;
  }

  return (
    <div className="wanikani-status">
      <GemDefs />
      <CurrentLevel data={data} />
      <LevelGems data={data} />
      <SrsProgress data={data} />
    </div>
  );
}
