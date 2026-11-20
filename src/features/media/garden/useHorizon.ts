import { RefObject, useLayoutEffect, useState } from 'react';

export function useHorizon(listRef: RefObject<HTMLUListElement | null>) {
  const [horizon, setHorizon] = useState<number>();

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const measureHorizon = () => {
      const firstPlot = list.firstElementChild;
      if (firstPlot instanceof HTMLElement) {
        setHorizon(firstPlot.offsetTop + firstPlot.offsetHeight);
      }
    };
    measureHorizon();

    const observer = new ResizeObserver(measureHorizon);
    observer.observe(list);
    return () => observer.disconnect();
  }, [listRef]);

  return horizon;
}
