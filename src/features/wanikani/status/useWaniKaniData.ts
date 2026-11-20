import { useEffect, useState } from 'react';
import { fetchWaniKaniData } from './fetchWaniKaniData';
import { WaniKaniData } from './types';

export function useWaniKaniData(apiKey: string) {
  const [data, setData] = useState<WaniKaniData>();
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    let isCurrent = true;
    fetchWaniKaniData(apiKey).then(
      (data) => isCurrent && setData(data),
      (error) => isCurrent && setError(error),
    );
    return () => {
      isCurrent = false;
    };
  }, [apiKey]);

  return { data, error };
}
