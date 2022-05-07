import {
  ScrollDirection,
  getItemScrollOffset,
  calcScrollDistanceBetween,
} from './virtualization';

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
  const visibleItemsScrollWidth = calcScrollDistanceBetween(itemsScrollIndex, startIndex, stopIndex);

  // Initial case when scrollbar is at the top.
  if (!scrollTopOffset && scrollDir === ScrollDirection.RIGHT) {
    return [0, visibleItemsScrollWidth - clientWidth];
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
