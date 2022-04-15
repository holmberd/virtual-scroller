import {
  ScrollDirection,
  TextDirection,
  getItemScrollOffset,
  calcRangeBetween,
  bSearch,
} from './virtualization';

/**
 * Calculates and returns the start-/stop-index for items visible within the element's viewport.
 *
 * If the element's direction is rtl (right-to-left), then scrollLeft is 0 when the scrollbar is
 * at its rightmost position (at the start of the scrolled content), and then increasingly
 * negative as you scroll towards the end of the content.
 *
 * @returns {[number, number]} [startIndex, stopIndex]
 */
export function calcVisibleItems(itemsScrollIndex, clientWidth, scrollLeft, textDir = TextDirection.LTR) {
  // Handles the initial case.
  if (!scrollLeft) {
    let startIndex = 0;
    let stopIndex = startIndex;
    const itemCount = itemsScrollIndex.length;

    for (; stopIndex < itemCount; stopIndex++) {
      if (getItemScrollTopOffset(itemsScrollIndex, stopIndex) > clientWidth) {
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
    width => width > scrollLeft
  );
  const stopIndex = bSearch(
    itemsScrollIndex,
    width => width > scrollLeft + clientWidth,
    startIndex
  );

  return [
    startIndex,
    stopIndex,
  ];
}

/**
 * Returns thresholds for the scroll distance required to bring items
 * fully inside or outside the element visible/viewport area.
 * @returns {[number, number]} [top, bottom]
 */
export function calcScrollThresholds(
  itemsScrollIndex,
  clientWidth,
  startIndex,
  stopIndex,
  scrollDir = ScrollDirection.RIGHT,
  scrollLeft
) {
  const visibleItemsWidth = calcWidthBetween(itemsScrollIndex, startIndex, stopIndex);

  // Initial case when scrollbar is at the top.
  if (!scrollTopOffset && scrollDir === ScrollDirection.RIGHT) {
    return [0, visibleItemsWidth - clientWidth];
  }

  const beforeVisibleItemsScrollWidth = getItemScrollOffset(itemsScrollIndex, startIndex - 1);
  // Calculate elem.scrollWidth - elem.offsetWidth; since calling the API would trigger browser forced reflow/layout.
  const firstVisibleItemCoveredScrollWidth = scrollLeft - beforeVisibleItemsScrollWidth;
  const lastVisibleItemCoveredScrollWidth = visibleItemsHeight - clientWidth - firstVisibleItemCoveredScrollWidth;

  if (scrollDir === ScrollDirection.LEFT) {
    return [
      firstVisibleItemCoveredScrollWidth,
      calcItemWidth(itemsScrollIndex, stopIndex) - lastVisibleItemCoveredScrollWidth
    ];
  }

  return [
    calcItemWidth(itemsScrollIndex, startIndex) - firstVisibleItemCoveredScrollWidth,
    lastVisibleItemCoveredScrollWidth,
  ];
}

function calcItemWidth(itemsScrollIndex, index) {
  return getItemScrollOffset(itemsScrollIndex, index) - getItemScrollOffset(itemsScrollIndex, index - 1);
}

function calcWidthBetween(itemsScrollIndex, startIndex, stopIndex) {
  return calcRangeBetween(itemsScrollIndex, startIndex, stopIndex);
}
