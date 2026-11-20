import { RefObject, useLayoutEffect } from 'react';

const GRID_CELL = 8;
const ROW_SPACING = 24;
const COLUMN_SPACING = 8;

const countCells = (length: number, spacing: number) =>
  Math.ceil((length + spacing) / GRID_CELL);

function countColumns(list: HTMLElement) {
  const { paddingInlineStart, paddingInlineEnd } = getComputedStyle(list);
  const width =
    list.clientWidth -
    parseFloat(paddingInlineStart) -
    parseFloat(paddingInlineEnd);
  return Math.max(1, Math.floor(width / GRID_CELL));
}

/** Sizes each plot's grid area to its plant, so short plants can fill the rows beside a tall one. */
export function useGridSpans(
  listRef: RefObject<HTMLUListElement | null>,
  plantCount: number,
) {
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const plots = [...list.children].filter(
      (plot): plot is HTMLElement => plot instanceof HTMLElement,
    );
    // A plant wider than the garden would otherwise add columns past its
    // edge, and the grid would place other plants out there.
    const sizePlots = () => {
      const maxColumns = countColumns(list);
      plots.forEach((plot) => {
        const plant = plot.firstElementChild;
        if (!plant) return;
        const { width, height } = plant.getBoundingClientRect();
        const columns = Math.min(countCells(width, COLUMN_SPACING), maxColumns);
        plot.style.setProperty('--columns', String(columns));
        plot.style.setProperty(
          '--rows',
          String(countCells(height, ROW_SPACING)),
        );
      });
    };
    sizePlots();

    const observer = new ResizeObserver(sizePlots);
    observer.observe(list);
    plots.forEach((plot) => {
      if (plot.firstElementChild) observer.observe(plot.firstElementChild);
    });
    return () => observer.disconnect();
  }, [listRef, plantCount]);
}
