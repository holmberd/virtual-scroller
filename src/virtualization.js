/**
 * Module contains functions to perform virtual scrolling calculations.
 * @module
 */

export const Layout = {
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical',

  isVertical(layout) {
    return Layout.VERTICAL === layout;
  },
};

/**
 * Calculates and returns the start-/stop-index for items within the element's visible scroll-window.
 * @returns {[number, number]} [startIndex, stopIndex]
 */
export function getVisibleItems(itemsScrollOffsetIndex, scrollWindowLength, scrollOffset) {
  if (!itemsScrollOffsetIndex.reduce((a, b) => a + b)) {
    // Items have no length.
    return [0, 0];
  }

  // Handles the initial case when no scrolling has occured.
  if (!scrollOffset) {
    let startIndex = 0;
    let stopIndex = startIndex;
    const itemCount = itemsScrollOffsetIndex.length;

    while (stopIndex < itemCount) {
      if (getItemScrollOffset(itemsScrollOffsetIndex, stopIndex) > scrollWindowLength) {
        break;
      }
      stopIndex++;
    }

    return [startIndex, stopIndex];
  }

  const startIndex = bSearch(
    itemsScrollOffsetIndex,
    itemScrollOffset => itemScrollOffset > scrollOffset
  );
  const stopIndex = bSearch(
    itemsScrollOffsetIndex,
    itemScrollOffset => itemScrollOffset > scrollOffset + scrollWindowLength,
    startIndex
  );

  return [startIndex, stopIndex];
}

/**
 * Calculates and returns thresholds for the scroll distance required to bring
 * items fully inside or outside the element visible/viewport area.
 * @returns {[number, number]} [top, bottom]
 */
export function getScrollThresholds(
  itemsScrollOffsetIndex,
  scrollWindowLength,
  startIndex,
  stopIndex,
  scrollOffset,
  scrollDistance,
) {
  const positiveScroll = scrollDistance > 0;
  const visibleItemsScrollLength = getScrollLength(itemsScrollOffsetIndex, startIndex, stopIndex);

  // Handles case when in start-position.
  if (!scrollOffset && positiveScroll) {
    return [0, visibleItemsScrollLength - scrollWindowLength];
  }

  const beforeVisibleItemsScrollLength = getItemScrollOffset(itemsScrollOffsetIndex, startIndex - 1);

  // Essentially calculates e.g. `elem.scrollHeight - elem.offsetHeight`
  // since calling either of those API's would trigger browser forced reflow/layout.
  const firstVisibleItemNonVisibleScrollLength = scrollOffset - beforeVisibleItemsScrollLength;
  const lastVisibleItemNonVisibleScrollLength =
    visibleItemsScrollLength - scrollWindowLength - firstVisibleItemNonVisibleScrollLength;

  // Scrolling up/left.
  if (!positiveScroll) {
    return [
      firstVisibleItemNonVisibleScrollLength,
      getItemScrollLength(itemsScrollOffsetIndex, stopIndex) - lastVisibleItemNonVisibleScrollLength
    ];
  }

  // Scrolling down/right.
  return [
    getItemScrollLength(itemsScrollOffsetIndex, startIndex) - firstVisibleItemNonVisibleScrollLength,
    lastVisibleItemNonVisibleScrollLength,
  ];
}

function getItemScrollLength(itemsScrollOffsetIndex, index) {
  return getItemScrollOffset(itemsScrollOffsetIndex, index) - getItemScrollOffset(itemsScrollOffsetIndex, index - 1);
}

/**
 * Builds and returns an array of scroll-offset for each item index.
 * Each index in the array represent the trailing edge scrolling position for that item.
 * @returns {number[]}
 */
export function buildItemsScrollOffsetIndex(itemCount, getItemLength) {
  const itemsScrollOffsetIndex = [];

  for (let i = 0; i < itemCount; i++) {
    if (i === 0) {
      itemsScrollOffsetIndex[i] = getItemLength(i);
      continue;
    }
    itemsScrollOffsetIndex[i] = itemsScrollOffsetIndex[i - 1] + getItemLength(i);
  }

  return itemsScrollOffsetIndex;
}

/**
 * Returns the scroll offset for the item at the specified index.
 * @returns {number}
 */
export function getItemScrollOffset(itemsScrollOffsetIndex, index) {
  return itemsScrollOffsetIndex[index] || 0;
}

/**
 * Calculates and returns the inclusive scroll length between two indexes.
 * @returns {number}
 */
export function getScrollLength(itemsScrollOffsetIndex, startIndex, stopIndex) {
  validateIndexes(itemsScrollOffsetIndex.length, startIndex, stopIndex);

  const stopIndexScrollOffset = getItemScrollOffset(itemsScrollOffsetIndex, stopIndex);
  const startIndexScrollOffset = getItemScrollOffset(itemsScrollOffsetIndex, startIndex - 1);

  return stopIndexScrollOffset - startIndexScrollOffset;
}

/**
 * Calculates and returns scroll width/height overflow before and after visible items.
 * @returns {[number, number]} [before, after]
 */
export function getScrollOverflow(itemsScrollOffsetIndex, startIndex, stopIndex) {
  const itemCount = itemsScrollOffsetIndex.length;
  validateIndexes(itemCount, startIndex, stopIndex);

  const beforeVisibleItemsScrollOffset = getItemScrollOffset(itemsScrollOffsetIndex, startIndex - 1);
  const afterVisibleItemsScrollOffset = stopIndex >= itemCount - 1
    ? 0 : getScrollLength(itemsScrollOffsetIndex, stopIndex + 1, itemCount - 1);

  return [beforeVisibleItemsScrollOffset, afterVisibleItemsScrollOffset];
}

export function validateIndexes(itemCount, startIndex, stopIndex) {
  if (startIndex > stopIndex) {
    throw Error('start index must come before stop index');
  }
  if (startIndex < 0 || stopIndex < 0 || stopIndex >= itemCount) {
    throw Error('startIndex must be > -1 and -1 < stopIndex < itemCount');
  }
  return true;
}

export function getScrollWindowLength(layout, width, height) {
  return Layout.isVertical(layout) ? height : width;
}

export function getScrollOffset(layout, scrollLeft, scrollTop) {
  return Layout.isVertical(layout) ? scrollTop : scrollLeft;
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
