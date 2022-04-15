export const TextDirection = {
  LTR: 'ltr',
  RTL: 'rtl',
};

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