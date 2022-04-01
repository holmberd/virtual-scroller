import { bSearch } from './utils';
import { ScrollDir } from './types';

/**
 * Calculates and returns the start and stop index for items visible within the clientHeight.
 * @returns {[number, number]} [startIndex, stopIndex]
 */
export function calcVisibleItems(scrollTop, itemCount, clientHeight, itemsHeightIndex) {
  // Handles the initial case when scrollbar is at the top.
  if (!scrollTop) {
    let startIndex = 0;
    let stopIndex = startIndex;
    for (; stopIndex < itemCount; stopIndex++) {
      if (getItemScrollTop(itemsHeightIndex, stopIndex) > clientHeight) {
        break;
      }
    }

    return [
      startIndex,
      stopIndex,
    ];
  }

  // Otherwise find startIndex using binary-search.
  const startIndex = bSearch(
    itemsHeightIndex,
    height => height > scrollTop
  );
  const stopIndex = bSearch(
    itemsHeightIndex,
    height => height > scrollTop + clientHeight,
    startIndex
  );

  return [
    startIndex,
    stopIndex,
  ];
}

/**
 * Returns scroll top offset for the item at the specified index.
 * @returns {number|undefined}
 */
function getItemScrollTop(itemsHeightIndex, index) {
  return itemsHeightIndex[index];
}

/**
 * Calculates height between to indexes.
 * @returns {number}
 */
function calcHeightBetween(itemsHeightIndex, startIndex, stopIndex) {
  if (startIndex > stopIndex) {
    throw Error('start index must come before stop index');
  }
  return getItemScrollTop(itemsHeightIndex, stopIndex) - (getItemScrollTop(itemsHeightIndex, startIndex - 1) || 0);
}

/**
 * Returns thresholds for scrolldistance required to bring top or bottom item
 * fully inside or outside the element viewport.
 * @returns {[number, number]} [top, bottom]
 */
export function calcScrollThresholds(
  itemsHeightIndex,
  clientHeight,
  startIndex,
  stopIndex,
  scrollDir = ScrollDir.DOWN,
  scrollTopOffset
) {
  const visibleItemsHeight = calcHeightBetween(itemsHeightIndex, startIndex, stopIndex);

  // Handles the initial case when scrollbar is at the top.
  if (!scrollTopOffset && scrollDir === ScrollDir.DOWN) {
    return [0, visibleItemsHeight - clientHeight];
  }

  const aboveVisibleItemsHeight = !startIndex ? 0 : getItemScrollTop(itemsHeightIndex, startIndex - 1);
  const firstVisibleItemTopOffset = scrollTopOffset - aboveVisibleItemsHeight;
  const lastVisibleItemBottomOffset = visibleItemsHeight - clientHeight - firstVisibleItemTopOffset;

  if (scrollDir === ScrollDir.UP) {
    return [
      firstVisibleItemTopOffset,
      getItemScrollTop(itemsHeightIndex, stopIndex) - lastVisibleItemBottomOffset
    ];
  }

  const topScrollThreshold = getItemScrollTop(itemsHeightIndex, startIndex) - firstVisibleItemTopOffset;
  return [topScrollThreshold, lastVisibleItemBottomOffset];
}

/**
 * Calculates scroll before/after visible items scroll overflow.
 * @returns {[number, number]} [before, after]
 */
export function calcScrollOverflow(itemsHeightIndex, itemCount, startIndex, stopIndex) {
  const beforeVisibleItemsHeight = startIndex <= 0
    ? 0 : getItemScrollTop(itemsHeightIndex, startIndex - 1);

  const afterVisibleItemsHeight = stopIndex >= itemCount - 1
    ? 0 : calcHeightBetween(itemsHeightIndex, stopIndex + 1, itemCount - 1);

  return [beforeVisibleItemsHeight, afterVisibleItemsHeight];
}
