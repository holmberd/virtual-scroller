export const ScrollDir = {
  DOWN: 'down',
  UP: 'up',
};

/**
 * Builds and returns an item scroll top offset index.
 * An index represents the scrollTop being at the bottom of the item.
 * @returns {number[]}
 */
export function buildItemsScrollIndex(itemCount, getItemHeight) {
  const itemsHeightCache = [];
  for (let i = 0; i < itemCount; i++) {
    if (!i) {
      itemsHeightCache[i] = getItemHeight(i);
      continue;
    }
    itemsHeightCache[i] = itemsHeightCache[i - 1] + getItemHeight(i);
  }

  return itemsHeightCache;
}

/**
 * Calculates and returns the start and stop index for items visible within the clientHeight.
 * @returns {[number, number]} [startIndex, stopIndex]
 */
export function calcVisibleItems(itemsScrollIndex, clientHeight, scrollTop) {
  // Handles the initial case when scrollbar is at the top.
  if (!scrollTop) {
    let startIndex = 0;
    let stopIndex = startIndex;
    const itemCount = itemsScrollIndex.length;

    for (; stopIndex < itemCount; stopIndex++) {
      if (getItemScrollTopOffset(itemsScrollIndex, stopIndex) > clientHeight) {
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
    itemsScrollIndex,
    height => height > scrollTop
  );
  const stopIndex = bSearch(
    itemsScrollIndex,
    height => height > scrollTop + clientHeight,
    startIndex
  );

  return [
    startIndex,
    stopIndex,
  ];
}

/**
 * Returns thresholds for the scroll distance required to bring top or bottom item
 * fully inside or outside the element viewport.
 * @returns {[number, number]} [top, bottom]
 */
export function calcScrollThresholds(
  itemsScrollIndex,
  clientHeight,
  startIndex,
  stopIndex,
  scrollDir = ScrollDir.DOWN,
  scrollTopOffset
) {
  const visibleItemsHeight = calcHeightBetween(itemsScrollIndex, startIndex, stopIndex);

  // Initial case when scrollbar is at the top.
  if (!scrollTopOffset && scrollDir === ScrollDir.DOWN) {
    return [0, visibleItemsHeight - clientHeight];
  }

  const aboveVisibleItemsHeight = getItemScrollTopOffset(itemsScrollIndex, startIndex - 1);
  const firstVisibleItemTopOffset = scrollTopOffset - aboveVisibleItemsHeight;
  const lastVisibleItemBottomOffset = visibleItemsHeight - clientHeight - firstVisibleItemTopOffset;

  if (scrollDir === ScrollDir.UP) {
    return [
      firstVisibleItemTopOffset,
      calcItemHeight(itemsScrollIndex, stopIndex) - lastVisibleItemBottomOffset
    ];
  }

  const topScrollThreshold = calcItemHeight(itemsScrollIndex, startIndex) - firstVisibleItemTopOffset;
  return [topScrollThreshold, lastVisibleItemBottomOffset];
}

/**
 * Calculates scroll before/after visible items scroll overflow.
 * @returns {[number, number]} [before, after]
 */
export function calcScrollOverflow(itemsScrollIndex, startIndex, stopIndex) {
  const itemCount = itemsScrollIndex.length;
  validateIndexes(itemCount, startIndex, stopIndex);

  const beforeVisibleItemsHeight = getItemScrollTopOffset(itemsScrollIndex, startIndex - 1);
  const afterVisibleItemsHeight = stopIndex >= itemCount - 1
    ? 0 : calcHeightBetween(itemsScrollIndex, stopIndex + 1, itemCount - 1);

  return [beforeVisibleItemsHeight, afterVisibleItemsHeight];
}

/**
 * Calculates height between to indexes.
 * @returns {number}
 */
export function calcHeightBetween(itemsScrollIndex, startIndex, stopIndex) {
  validateIndexes(itemsScrollIndex.length, startIndex, stopIndex);

  const stopIndexScrollTopOffset = getItemScrollTopOffset(itemsScrollIndex, stopIndex);
  const startIndexScrollTopOffset = getItemScrollTopOffset(itemsScrollIndex, startIndex - 1);

  return stopIndexScrollTopOffset - startIndexScrollTopOffset;
}

function calcItemHeight(itemsScrollIndex, index) {
  return getItemScrollTopOffset(itemsScrollIndex, index) - getItemScrollTopOffset(itemsScrollIndex, index - 1);
}

/**
 * Returns the scroll height top offset for the item at the specified index.
 * @returns {number}
 */
function getItemScrollTopOffset(itemsScrollIndex, index) {
  if (!itemsScrollIndex) {
    throw Error('Missing required argument: itemsScrollIndex');
  }
  return itemsScrollIndex[index] || 0;
}

function validateIndexes(itemCount, startIndex, stopIndex) {
  if (startIndex > stopIndex) {
    throw Error('start index must come before stop index');
  }
  if (startIndex < 0 || stopIndex < 0 || stopIndex >= itemCount) {
    throw Error('startIndex must be > -1 and -1 < stopIndex < itemCount');
  }
  return true;
}

/**
 * Performs a binary-search on the array by testing
 * each element in the array against the provided function.
 */
function bSearch(array, callback, start = -1) {
  let end = array.length - 1;
  while (start + 1 < end) {
    const mid = start + ((end - start) >> 1);
    if (callback(array[mid])) {
      end = mid;
    } else {
      start = mid;
    }
  }
  return end;
}
