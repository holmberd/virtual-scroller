export const ScrollDirection = {
  LEFT: 'left',
  RIGHT: 'right',
  UP: 'up',
  DOWN: 'down',
};

export const Virtualization = {
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical',
};

export const TextDirection = {
  LTR: 'ltr',
  RTL: 'rtl',
};

/**
 * Calculates and returns the start-/stop-index for items within the element's visible scroll-window.
 * @returns {[number, number]} [startIndex, stopIndex]
 */
export function calcVisibleItems(itemsScrollOffsetIndex, scrollWindowLength, scrollOffset) {
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
 * Returns thresholds for the scroll distance required to bring items
 * fully inside or outside the element visible/viewport area.
 * @returns {[number, number]} [top, bottom]
 */
export function calcScrollThresholds(
  itemsScrollIndex,
  clientLength,
  startIndex,
  stopIndex,
  scrollDir = ScrollDirection.RIGHT,
  scrollOffset
) {
  const { LEFT, UP, RIGHT, DOWN } = ScrollDirection;

  const visibleItemsScrollLength = getScrollLength(itemsScrollIndex, startIndex, stopIndex);

  // Handles case when in start-position.
  if (!scrollOffset && ([RIGHT, DOWN].includes(scrollDir))) {
    return [0, visibleItemsScrollLength - clientLength];
  }

  const beforeVisibleItemsScrollLength = getItemScrollOffset(itemsScrollIndex, startIndex - 1);

  // Essentially calculates e.g. `elem.scrollHeight - elem.offsetHeight`
  // since calling either of those API's would trigger browser forced reflow/layout.
  const firstVisibleItemNonVisibleScrollLength = scrollOffset - beforeVisibleItemsScrollLength;
  const lastVisibleItemNonVisibleScrollLength =
    visibleItemsScrollLength - clientLength - firstVisibleItemNonVisibleScrollLength;

  // Scrolling down/right.
  if (![LEFT, UP].includes(scrollDir)) {
    return [
      calcItemScrollLength(itemsScrollIndex, startIndex) - firstVisibleItemNonVisibleScrollLength,
      lastVisibleItemNonVisibleScrollLength,
    ];
  }

  // Scrolling up/left.
  return [
    firstVisibleItemNonVisibleScrollLength,
    calcItemScrollLength(itemsScrollIndex, stopIndex) - lastVisibleItemNonVisibleScrollLength
  ];
}

function calcItemScrollLength(itemsScrollIndex, index) {
  return getItemScrollOffset(itemsScrollIndex, index) - getItemScrollOffset(itemsScrollIndex, index - 1);
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
  if (!itemsScrollOffsetIndex) {
    throw Error('Missing required argument: itemsScrollOffsetIndex');
  }
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
 * Calculates scroll width overflow before/after visible items.
 * @returns {[number, number]} [before, after]
 */
export function calcScrollOverflow(itemsScrollOffsetIndex, startIndex, stopIndex) {
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

function isVertical(virtualization) {
  return Virtualization.VERTICAL === virtualization;
}

export function getScrollDirection(scrollDistance) {
  if (isVertical()) {
    return scrollDistance > 0 ? ScrollDirection.RIGHT : ScrollDirection.LEFT;
  }
  return scrollDistance > 0 ? ScrollDirection.DOWN : ScrollDirection.UP;
}

export function getScrollWindowLength(virtualization, width, height) {
  return isVertical(virtualization) ? width : height;
}

export function getScrollOffset(virtualization, scrollLeft, scrollTop) {
  return isVertical(virtualization) ? scrollLeft : scrollTop;
}

/**
 * Performs a binary-search on the array by testing
 * each element in the array against the provided function.
 */
export function bSearch(array, callback, start = -1) {
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
