import { throttle } from './utils';

// TODO
// - Replace getItemsHeight with itemsHeightIndex.
//  - change calcOverflow to use heightIndex if it's ready, perhaps build it right away?
//    -  can probably fetch from index if it's available.
// - Add tests.
// TODO(dag): write scroll tests (replace/append items, no need to optimize).

const template = document.createElement('template');
const listItemSheet = new CSSStyleSheet();
listItemSheet.replaceSync(`
  :host {
    display: block;
    position: relative;
    contain: content;
    overflow: scroll;
    overflow-x: hidden;
  }
  #top-overflow, #bottom-overflow {
    visibility: hidden;
  }
`);

template.innerHTML = `
  <div id='top-overflow'></div>
  <slot></slot>
  <div id='bottom-overflow'></div>
`;

const Event = {
  VISIBLE_RANGE_CHANGE: 'visibleRangeChange',
};

const ScrollDir = {
  DOWN: 'down',
  UP: 'up',
};

// Element callback fires when it needs new elements to render on scroll.

export default class VirtualScroller extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.appendChild(document.importNode(template.content, true));
    shadowRoot.adoptedStyleSheets = [listItemSheet];

    this.itemCount = 0;
    this.visibleOffset = 0;
    this.lastScrollPosition = 0;
    this.visibleStartIndex = 0;
    this.visibleStopIndex = 0;
    this.observer = null;

    this._itemsHeightIndex = [];
    this._heightCache = 0;
    this.calcItemHeight = () => 0;
  }

  get height() {
    return this._heightCache || this.clientHeight;
  }

  set height(value) {
    this._heightCache = value;
  }

  get itemsHeightIndex() {
    return this._itemsHeightIndex;
  }

  set itemsHeightIndex(value) {
    this._itemsHeightIndex = value;
  }

  getItemHeight(index) {
    return this._itemsHeightIndex[index];
  }

  connectedCallback() {
    this.height = this.clientHeight; // Cache this for calculations.
    this.lastScrollPosition = this.scrollTop;

    const throttledHandleScroll = throttle(this.handleScroll.bind(this), 5);

    this.addEventListener('scroll', throttledHandleScroll);

    // The more specific selector the better the performance lookup.
    // const items = [...this.querySelectorAll(`:scope > *`)];

    // this.observer = new MutationObserver((mutationsList) => {
    //   for (const mutation of mutationsList) {
    //     if (mutation.type !== 'childList') {
    //       return;
    //     }
    //     const items = [...this.querySelectorAll(`:scope > *`)];
    //     console.log(items);
    //   }
    // });

    // this.observer.observe(this, { childList: true, subtree: false });
  }

  disconnectedCallback() {
    // this.observer && this.observer.disconnect();
  }

  /**
   * @public
   * @param {number} itemCount
   * @param {function} calcItemHeight
   */
  init(itemCount, calcItemHeight) {
    this.itemCount = itemCount;
    this.calcItemHeight = calcItemHeight;
    this.itemsHeightIndex = this.buildItemsHeightIndex(itemCount);
    this.update();
  }

  /**
   * @public
   */
  resetItemsHeightIndex() {
    this.itemsHeightIndex = this.buildItemsHeightIndex(this.itemCount);
    this.update();
  }

  /**
   * @private
   * @param {number} itemCount
   * @returns {number[]}
   */
  buildItemsHeightIndex(itemCount) {
    const itemsHeightCache = [];
    for (let i = 0; i < itemCount; i++) {
      if (!i) {
        itemsHeightCache[i] = this.calcItemHeight(i);
        continue;
      }
      itemsHeightCache[i] = itemsHeightCache[i - 1] + this.calcItemHeight(i);
    }

    return itemsHeightCache;
  }

  /**
   * @private
   */
  update() {
    const [startIndex, stopIndex] = this.calcVisibleItems(this.scrollTop);
    this.updateVisibleItemIndexes(startIndex, stopIndex);
  }


  /**
   * Calculates and returns the start and stop index for items visible within the clientHeight.
   * @param {number} scrollTop
   * @returns {[number, number]} [startIndex, stopIndex]
   */
  calcVisibleItems(scrollTop) {
    // Handles the initial case when scrollbar is at the top.
    if (!scrollTop) {
      let startIndex = 0;
      let stopIndex = startIndex;
      for (; stopIndex < this.itemCount; stopIndex++) {
        if (this.getItemHeight(stopIndex) > this.height) {
          break;
        }
      }

      return [
        startIndex,
        stopIndex,
      ];
    }

    // Otherwise find startIndex using binary-search.
    const startIndex = bSearch(this.itemsHeightIndex, height => height > scrollTop);
    const stopIndex = bSearch(
      this.itemsHeightIndex,
      height => height > scrollTop + this.height,
      startIndex
    );

    return [
      startIndex,
      stopIndex,
    ];
  }

  /**
   * @private
   * @param {number} startIndex
   * @param {number} stopIndex
   * @emits visibleRangeChange
   */
  updateVisibleItemIndexes(startIndex, stopIndex) {
    if (this.visibleStartIndex === startIndex && this.visibleStopIndex === stopIndex) {
      return;
    }
    this.visibleStartIndex = startIndex;
    this.visibleStopIndex = stopIndex;

    const offsetStartIndex = startIndex === 0
      ? 0 : startIndex - this.visibleOffset >= 0
        ? startIndex - this.visibleOffset : 0;

    const offsetStopIndex = stopIndex === 0
      ? 0 : stopIndex + this.visibleOffset < this.itemCount
        ? stopIndex + this.visibleOffset : this.itemCount;

    this.updateScrollOverflow(offsetStartIndex, offsetStopIndex);

    this.dispatchEvent(
      new CustomEvent(Event.VISIBLE_RANGE_CHANGE, {
        detail: {
          startIndex: offsetStartIndex,
          stopIndex: offsetStopIndex,
        },
        bubbles: true,
      })
    );
  }

  /**
   * @private
   * @param {ScrollEvent} e
   */
  handleScroll(e) {
    const scrollTopOffset = this.scrollTop;
    console.log(scrollTopOffset);
    const scrollDistance = scrollTopOffset - this.lastScrollPosition;
    const isScrollDirDown = scrollDistance > 0;
    this.lastScrollPosition = scrollTopOffset;

    const [
      topThreshold,
      bottomThreshold
    ] = this.calcScrollThresholds(isScrollDirDown ? ScrollDir.DOWN : ScrollDir.UP, scrollTopOffset);

    if (bottomThreshold < 0 || topThreshold < 0) {
      const [startIndex, stopIndex] = this.calcVisibleItems(scrollTopOffset);
      this.updateVisibleItemIndexes(startIndex, stopIndex);
    }
  }

  /**
   * @private
   * @param {number} startIndex
   * @param {number} stopIndex
   * @returns {number}
   */
  calcHeightBetween(startIndex, stopIndex) {
    if (startIndex > stopIndex) {
      throw Error('start index must come before stop index');
    }
    return this.getItemHeight(stopIndex) - (this.getItemHeight(startIndex - 1) || 0);
  }

  /**
   * Returns thresholds for scrolldistance required to
   * bring top or bottom row/item fully inside or outside visible view.
   *
   * @private
   * @param {string} scrollDir
   * @param {number} scrollTopOffset
   * @returns {[number, number]} [top, bottom]
   */
  calcScrollThresholds(scrollDir = ScrollDir.DOWN, scrollTopOffset) {
    const visibleItemsHeight = this.calcHeightBetween(this.visibleStartIndex, this.visibleStopIndex);

    // Handles the initial case when scrollbar is at the top.
    if (!scrollTopOffset && scrollDir === ScrollDir.DOWN) {
      return [0, visibleItemsHeight - this.height];
    }

    const aboveVisibleItemsHeight = !this.visibleStartIndex ? 0 : this.getItemHeight(this.visibleStartIndex - 1);
    const firstVisibleItemTopOffset = scrollTopOffset - aboveVisibleItemsHeight;
    const lastVisibleItemBottomOffset = visibleItemsHeight - this.height - firstVisibleItemTopOffset;

    if (scrollDir === ScrollDir.UP) {
      return [
        firstVisibleItemTopOffset,
        this.getItemHeight(this.visibleStopIndex) - lastVisibleItemBottomOffset
      ];
    }

    const topScrollThreshold = this.getItemHeight(this.visibleStartIndex) - firstVisibleItemTopOffset;
    return [topScrollThreshold, lastVisibleItemBottomOffset];
  }

  /**
   * @private
   * @param {number} startIndex
   * @param {number} stopIndex
   */
  updateScrollOverflow(startIndex, stopIndex) {
    const [topOverflowHeight, bottomOverflowHeight] = this.calcScrollOverflow(startIndex, stopIndex);
    this.setTopOverflowHeight(topOverflowHeight);
    this.setBottomOverflowHeight(bottomOverflowHeight);
  }

  /**
   * @private
   * @param {number} startIndex
   * @param {number} stopIndex
   * @returns {[number, number]} [before, after]
   */
  calcScrollOverflow(startIndex, stopIndex) {
    const beforeVisibleItemsHeight = startIndex <= 0
      ? 0 : this.getItemHeight(startIndex - 1);

    const afterVisibleItemsHeight = stopIndex >= this.itemCount - 1
      ? 0 : this.calcHeightBetween(stopIndex + 1, this.itemCount - 1);

    return [beforeVisibleItemsHeight, afterVisibleItemsHeight];
  }

  /**
   * @private
   * @param {number} height
   */
  setBottomOverflowHeight(height) {
    const bottomOverflowElement = this.shadowRoot.querySelector('#bottom-overflow');
    bottomOverflowElement.style.height = `${Math.max(0, height)}px`;
  }

  /**
   * @private
   * @param {number} height
   */
  setTopOverflowHeight(height) {
    const topOverflowElement = this.shadowRoot.querySelector('#top-overflow');
    topOverflowElement.style.height = `${Math.max(0, height)}px`;
  }
}

if (!customElements.get('virtual-scroller')) {
  customElements.define('virtual-scroller', VirtualScroller)
}

/**
 * Binary search
 * @param {number[]} array
 * @param {function} pred
 * @param {number} start
 * @returns {number}
 */
function bSearch(array, pred, start = -1) {
  let end = array.length;
  while (start + 1 < end) {
    const mid = start + ((end - start) >> 1);
    if (pred(array[mid])) {
      end = mid;
    } else {
      start = mid;
    }
  }
  return end;
}