import {
  ScrollDir,
  calcVisibleItems,
  calcScrollThresholds,
  calcScrollOverflow,
} from './virtualization';
import { throttle } from './utils';

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

    this._itemsScrollIndex = [];
    this._clientHeightCache = 0;
    this._calcItemHeight = () => 0;
  }

  get calcItemHeight() {
    return this._calcItemHeight;
  }

  set calcItemHeight(fn) {
    this._calcItemHeight = fn;
  }

  get height() {
    return this._clientHeightCache || this.clientHeight;
  }

  set height(value) {
    this._clientHeightCache = value;
  }

  get itemsScrollIndex() {
    return this._itemsScrollIndex;
  }

  set itemsScrollIndex(value) {
    this._itemsScrollIndex = value;
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
    this.itemsScrollIndex = this.buildItemsScrollIndex();
    this.update();
  }

  /**
   * @public
   */
  resetItemsScrollIndex() {
    this.itemsScrollIndex = this.buildItemsScrollIndex();
    this.update();
  }

  /**
   * @public
   */
  update() {
    const [startIndex, stopIndex] = calcVisibleItems(
      this.itemsScrollIndex,
      this.itemCount,
      this.height,
      this.scrollTop
    );
    this.updateVisibleItemIndexes(startIndex, stopIndex);
  }

  /**
   * @private
   * @param {number} itemCount
   * @returns {number[]}
   */
  buildItemsScrollIndex() {
    const itemsHeightCache = [];
    for (let i = 0; i < this.itemCount; i++) {
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
    ] = calcScrollThresholds(
      this.itemsScrollIndex,
      this.height,
      this.visibleStartIndex,
      this.visibleStopIndex,
      isScrollDirDown ? ScrollDir.DOWN : ScrollDir.UP,
      scrollTopOffset,
    );

    if (bottomThreshold < 0 || topThreshold < 0) {
      const [startIndex, stopIndex] = calcVisibleItems(
        scrollTopOffset,
        this.itemCount,
        this.height,
        this.itemsScrollIndex
      );
      this.updateVisibleItemIndexes(startIndex, stopIndex);
    }
  }

  /**
   * @private
   * @param {number} startIndex
   * @param {number} stopIndex
   */
  updateScrollOverflow(startIndex, stopIndex) {
    const [topOverflowHeight, bottomOverflowHeight] = calcScrollOverflow(
      this.itemsScrollIndex,
      this.itemCount,
      startIndex,
      stopIndex
    );
    this.setTopOverflowHeight(topOverflowHeight);
    this.setBottomOverflowHeight(bottomOverflowHeight);
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
