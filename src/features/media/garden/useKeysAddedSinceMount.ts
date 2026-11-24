import { useState } from 'react';

export function useKeysAddedSinceMount(keys: string[]) {
  const [keysAtMount] = useState(() => new Set(keys));
  return new Set(keys.filter((key) => !keysAtMount.has(key)));
}
