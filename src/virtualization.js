export const ScrollDirection = {
  LEFT: 'left',
  RIGHT: 'right',
  UP: 'up',
  DOWN: 'down',
};

export const TextDirection = {
  LTR: 'ltr',
  RTL: 'rtl',
};

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

/**
 * Builds and returns an array of each item's scroll index.
 * @returns {number[]}
 */
export function buildItemsScrollIndex(itemCount, getItemSize, textDir = TextDirection.LTR) {
  const itemsScrollIndex = [];

  if (textDir === TextDirection.RTL) {
    for (let i = itemCount - 1; i <= 0; i--) {
      if (i === itemCount - 1) {
        itemsScrollIndex[i] = getItemSize(i);
        continue;
      }
      itemsScrollIndex[i] = itemsScrollIndex[i - 1] + getItemSize(i);
    }

    return itemsScrollIndex;
  }

  for (let i = 0; i < itemCount; i++) {
    if (i === 0) {
      itemsScrollIndex[i] = getItemSize(i);
      continue;
    }
    itemsScrollIndex[i] = itemsScrollIndex[i - 1] + getItemSize(i);
  }

  return itemsScrollIndex;
}

/**
 * Returns the scroll offset for the item at the specified index.
 * @returns {number}
 */
export function getItemScrollOffset(itemsScrollIndex, index) {
  if (!itemsScrollIndex) {
    throw Error('Missing required argument: itemsScrollIndex');
  }
  return itemsScrollIndex[index] || 0;
}

/**
 * Calculates the inclusive range between two indexes.
 * @returns {number}
 */
export function calcRangeBetween(itemsScrollIndex, startIndex, stopIndex) {
  validateIndexes(itemsScrollIndex.length, startIndex, stopIndex);

  const stopIndexScrollOffset = getItemScrollOffset(itemsScrollIndex, stopIndex);
  const startIndexScrollOffset = getItemScrollOffset(itemsScrollIndex, startIndex - 1);

  return stopIndexScrollOffset - startIndexScrollOffset;
}

/**
 * Calculates scroll width overflow before/after visible items.
 * @returns {[number, number]} [before, after]
 */
export function calcScrollOverflow(itemsScrollIndex, startIndex, stopIndex) {
  const itemCount = itemsScrollIndex.length;
  validateIndexes(itemCount, startIndex, stopIndex);

  const beforeVisibleItemsScrollOffset = getItemScrollOffset(itemsScrollIndex, startIndex - 1);
  const afterVisibleItemsScrollOffset = stopIndex >= itemCount - 1
    ? 0 : calcRangeBetween(itemsScrollIndex, stopIndex + 1, itemCount - 1);

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