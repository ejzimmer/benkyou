import { RefObject, useLayoutEffect, useState } from 'react';

export function useHorizon(listRef: RefObject<HTMLUListElement | null>) {
  const [horizon, setHorizon] = useState<number>();

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const measureHorizon = () => {
      const grounds = [...list.children]
        .filter(
          (plot): plot is HTMLElement =>
            plot instanceof HTMLElement &&
            !plot.classList.contains('add-media-plot'),
        )
        .map((plot) => plot.offsetTop + plot.offsetHeight);
      if (grounds.length) setHorizon(Math.min(...grounds));
    };
    measureHorizon();

    const observer = new ResizeObserver(measureHorizon);
    observer.observe(list);
    return () => observer.disconnect();
  }, [listRef]);

  return horizon;
}
