import {
  Layout,
  getScrollWindowLength,
  getScrollOffset,
  getVisibleItems,
  getScrollOverflow,
  getScrollThresholds,
  getItemScrollOffset,
  buildItemsScrollOffsetIndex,
} from './virtualization';
import { debounce } from './utils';

export { Layout } from './virtualization';
export const VISIBLE_RANGE_CHANGE_EVENT = 'visible-range-change';

/**
 * Represent last visible index update.
 */
class LastUpdate {
  constructor(startIndex, stopIndex, offsetIndex, itemsScrollOffsetIndex) {
    this.setUpdate(startIndex, stopIndex, offsetIndex, itemsScrollOffsetIndex);
  }

  setUpdate(startIndex, stopIndex, offsetIndex, itemsScrollOffsetIndex) {
    this.startIndex = startIndex;
    this.stopIndex = stopIndex;
    this.offsetIndex = offsetIndex;
    this.itemsScrollOffsetIndex = itemsScrollOffsetIndex;
  }

  clear() {
    this.startIndex = undefined;
    this.stopIndex = undefined;
    this.offsetIndex = undefined;
    this.itemsScrollOffsetIndex = undefined;
  }

  isEqual(startIndex, stopIndex, offsetIndex, itemsScrollOffsetIndex) {
    return startIndex === this.startIndex &&
      stopIndex === this.stopIndex &&
      offsetIndex === this.offsetIndex &&
      itemsScrollOffsetIndex === this.itemsScrollOffsetIndex;
  }
}

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: flex;
      flex-direction: column;
      position: relative;
      contain: content;
      overflow: auto;
    }
    :host([layout=horizontal]) {
      flex-direction: row;
    }
    :host, ::slotted(*) {
      box-sizing: border-box;
    }
    ::slotted(*) {
      flex-shrink: 0;
    }
    #before-overflow, #after-overflow {
      visibility: hidden !important;
      flex-shrink: 0 !important;
    }
  </style>

  <div id='before-overflow'></div>
  <slot></slot>
  <div id='after-overflow'></div>
`;

/**
 * Represent the VirtualScroller element.
 */
export default class VirtualScroller extends HTMLElement {
  #RESIZE_OBSERVER_DEBOUNCE_MS;
  #visibleStartIndex;
  #visibleStopIndex;
  #offsetVisibleIndex;
  #lastUpdate;
  #itemCount;
  #itemsScrollOffsetIndex;
  #lastScrollOffset;
  #clientHeightCache;
  #clientWidthCache;
  #resizeObserver;
  #enableResizeObserver;
  #beforeOverflowElement;
  #afterOverflowElement;
  #disableVirtualization;
  #initialized;
  #getItemLength;


  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.appendChild(document.importNode(template.content, true));

    this.#RESIZE_OBSERVER_DEBOUNCE_MS = 20;
    this.#visibleStartIndex = 0;
    this.#visibleStopIndex = 0;
    this.#offsetVisibleIndex = 0;
    this.#lastUpdate = new LastUpdate();
    this.#itemCount = 0;
    this.#itemsScrollOffsetIndex = [];
    this.#lastScrollOffset = 0;
    this.#clientHeightCache = null;
    this.#clientWidthCache = null;
    this.#resizeObserver = null;
    this.#enableResizeObserver = false;
    this.#beforeOverflowElement = null;
    this.#afterOverflowElement = null;
    this.#disableVirtualization = false;
    this.#initialized = false;
    this.#getItemLength = () => 0;
  }

  get #height() {
    return this.#clientHeightCache ?? this.clientHeight;
  }

  set #height(value) {
    this.#clientHeightCache = value;
  }

  get #width() {
    return this.#clientWidthCache ?? this.clientWidth;
  }

  set #width(value) {
    this.#clientWidthCache = value;
  }

  get #scrollWindowLength() {
    return getScrollWindowLength(this.layout, this.#width, this.#height);
  }

  get getItemLength() {
    return this.#getItemLength;
  }

  set getItemLength(cb) {
    if (cb === this.#getItemLength) {
      return;
    }
    this.#getItemLength = cb;
    this.#updateItemsScrollOffsetIndex();
    this.#update();
  }

  get itemCount() {
    return this.#itemCount;
  }

  set itemCount(value) {
    if (value < 0) {
      throw Error('Item count must be >= 0');
    }
    if (this.#itemCount === value) {
      return;
    }
    this.#itemCount = value;
    this.#updateItemsScrollOffsetIndex();
    this.#update();
  }

  get offsetVisibleIndex() {
    return this.#offsetVisibleIndex;
  }

  set offsetVisibleIndex(value) {
    if (value < 0) {
      throw Error('Offset visible index must be >= 0');
    }
    if (this.#offsetVisibleIndex === value) {
      return;
    }
    this.#offsetVisibleIndex = value;
    this.#update();
  }

  get enableResizeObserver() {
    return this.#enableResizeObserver;
  }

  set enableResizeObserver(enable) {
    if (enable) {
      this.#connectResizeObserver();
    } else {
      this.#disconnectResizeObserver();
    }
    this.#enableResizeObserver = Boolean(enable);
  }

  get layout() {
    return this.hasAttribute('layout')
      ? this.getAttribute('layout')
      : Layout.VERTICAL;
  }

  set layout(value) {
    if (!Object.values(Layout).includes(value)) {
      throw Error(`Invalid layout. Must be one of: [vertical, horizontal]`);
    }
    this.setAttribute('layout', value);
  }

  #getScrollOffset() {
    return getScrollOffset(this.layout, this.scrollLeft, this.scrollTop);
  }

  connectedCallback() {
    if (!this.isConnected) {
      return;
    }
    // Cache client dimensions for future calculations.
    this.#height = this.clientHeight;
    this.#width = this.clientWidth;
    this.#lastScrollOffset = this.#getScrollOffset();
    this.#beforeOverflowElement = this.shadowRoot.querySelector('#before-overflow');
    this.#afterOverflowElement = this.shadowRoot.querySelector('#after-overflow');

    // If we needed to throttle this, e.g. 1000/60 = 16 ms at 60fps, ensure we get the last event.
    this.addEventListener('scroll', this.#handleScroll.bind(this));

    if (this.enableResizeObserver) {
      this.#connectResizeObserver();
    }
    if (this.#initialized) {
      this.#update();
    }
  }

  disconnectedCallback() {
    this.removeEventListener('scroll', this.#handleScroll);
    this.#disconnectResizeObserver();
  }

  /**
   * @public
   */
  init(itemCount, getItemLength, {
    layout = this.layout,
    enableResizeObserver = this.enableResizeObserver,
    offsetVisibleIndex = this.offsetVisibleIndex,
    disableVirtualization = this.#disableVirtualization,
  } = {}) {
    this.#itemCount = itemCount;
    this.#getItemLength = getItemLength;
    this.#offsetVisibleIndex = offsetVisibleIndex;
    this.layout = layout;
    this.enableResizeObserver = enableResizeObserver;
    this.#disableVirtualization = disableVirtualization;
    this.#updateItemsScrollOffsetIndex();

    this.#initialized = true;
    this.#update();
  }

  reset() {
    this.scrollTop = 0;
    this.scrollLeft = 0;
  }

  /**
   * @public
   * Rebuilds the items cached scrollOffset index on and after the specified index when called.
   */
  resetOnIndex(index = 0, shouldUpdate = true) {
    if (index < 0) {
      throw Error('Offset visible index must be >= 0');
    }
    this.#updateItemsScrollOffsetIndex(index);
    shouldUpdate && this.#update();
  }

  /**
   * @public
   */
  scrollToItem(index) {
    const itemScrollOffset = getItemScrollOffset(this.#itemsScrollOffsetIndex, index - 1);
    if (Layout.isVertical(this.layout)) {
      this.scrollTop = itemScrollOffset;
    } else {
      this.scrollLeft = itemScrollOffset;
    }
  }

  #updateItemsScrollOffsetIndex(index = 0) {
    if (index) {
      const itemsScrollOffsetIndexOnIndex = buildItemsScrollOffsetIndex(
        this.itemCount,
        this.getItemLength,
        index
      );
      this.#itemsScrollOffsetIndex = this.#itemsScrollOffsetIndex
        .slice(0, index)
        .concat(itemsScrollOffsetIndexOnIndex);
    } else {
      this.#itemsScrollOffsetIndex = buildItemsScrollOffsetIndex(
        this.itemCount,
        this.getItemLength,
      );
    }
  }

  /**
   * @emits visible-range-change
   */
  #update(scrollOffset) {
    if (!this.isConnected || !this.#initialized) {
      return;
    }

    // Guard against `itemCount` or the sum of `getItemLength` being zero.
    if (!this.itemCount || !this.#itemsScrollOffsetIndex.reduce((a, b) => a + b)) {
      const startIndex = 0;
      const stopIndex = 0;
      this.#setVisibleItemIndexes(startIndex, stopIndex);
      this.#setScrollOverflow(0, 0);
      this.#lastUpdate.setUpdate(
        startIndex,
        stopIndex,
        this.offsetVisibleIndex,
        this.#itemsScrollOffsetIndex
      );

      this.dispatchEvent(
        new CustomEvent(VISIBLE_RANGE_CHANGE_EVENT, {
          detail: {
            startIndex,
            stopIndex,
            offsetIndex: this.offsetVisibleIndex,
          },
          bubbles: true,
        })
      );
      return;
    }

    const [startIndex, stopIndex] = getVisibleItems(
      this.#itemsScrollOffsetIndex,
      this.#scrollWindowLength,
      scrollOffset ?? this.#getScrollOffset(),
    );
    const [offsetStartIndex, offsetStopIndex] = this.#getOffsetItemIndexes(startIndex, stopIndex);

    if (this.#lastUpdate.isEqual(
      offsetStartIndex,
      offsetStopIndex,
      this.offsetVisibleIndex,
      this.#itemsScrollOffsetIndex
    )) {
      return;
    }

    this.#setVisibleItemIndexes(startIndex, stopIndex);
    !this.#disableVirtualization && this.#updateScrollOverflow(offsetStartIndex, offsetStopIndex);

    this.#lastUpdate.setUpdate(
      offsetStartIndex,
      offsetStopIndex,
      this.offsetVisibleIndex,
      this.#itemsScrollOffsetIndex
    );

    this.dispatchEvent(
      new CustomEvent(VISIBLE_RANGE_CHANGE_EVENT, {
        detail: {
          startIndex: offsetStartIndex,
          stopIndex: offsetStopIndex,
          offsetIndex: this.offsetVisibleIndex,
        },
        bubbles: true,
      })
    );
  }

  #setVisibleItemIndexes(startIndex, stopIndex) {
    this.#visibleStartIndex = startIndex;
    this.#visibleStopIndex = stopIndex;
  }

  #getOffsetItemIndexes(startIndex, stopIndex) {
    const offsetStartIndex = Math.max(0, startIndex - this.offsetVisibleIndex);
    const offsetStopIndex = Math.min(Math.max(0, this.itemCount - 1), stopIndex + this.offsetVisibleIndex);
    return [offsetStartIndex, offsetStopIndex];
  }

  #handleScroll() {
    const scrollOffset = this.#getScrollOffset();
    if (scrollOffset === this.#lastScrollOffset) {
      return;
    }
    const scrollDistance = scrollOffset - this.#lastScrollOffset;
    this.#lastScrollOffset = scrollOffset;

    const [
      firstThreshold,
      secondThreshold
    ] = getScrollThresholds(
      this.#itemsScrollOffsetIndex,
      this.#scrollWindowLength,
      this.#visibleStartIndex,
      this.#visibleStopIndex,
      scrollOffset,
      scrollDistance,
    );

    if (secondThreshold < 0 || firstThreshold < 0) {
      this.#update(scrollOffset);
    }
  }

  #connectResizeObserver() {
    if (this.#resizeObserver) {
      return;
    }
    const debouncedHandleResize = debounce(this.#handleResize.bind(this), this.#RESIZE_OBSERVER_DEBOUNCE_MS);
    this.#resizeObserver = new ResizeObserver(debouncedHandleResize);
    this.#resizeObserver.observe(this);
  }

  #disconnectResizeObserver() {
    if (!this.#resizeObserver) {
      return;
    }
    this.#resizeObserver.disconnect();
    this.#resizeObserver = null;
  }

  #handleResize() {
    const scrollWindowLength = getScrollWindowLength(
      this.layout,
      this.clientWidth,
      this.clientHeight
    );

    if (scrollWindowLength !== this.#scrollWindowLength) {
      this.#height = this.clientHeight;
      this.#width = this.clientWidth;
      this.#update();
    }
  }

  #updateScrollOverflow(startIndex, stopIndex) {
    const [beforeScrollLength, afterScrollLength] = getScrollOverflow(
      this.#itemsScrollOffsetIndex,
      startIndex,
      stopIndex
    );

    this.#setScrollOverflow(beforeScrollLength, afterScrollLength);
  }

  #setScrollOverflow(beforeScrollLength, afterScrollLength) {
    const dimension = Layout.isVertical(this.layout) ? 'height' : 'width';
    this.#beforeOverflowElement.style[dimension] = `${Math.max(0, beforeScrollLength)}px`;
    this.#afterOverflowElement.style[dimension] = `${Math.max(0, afterScrollLength)}px`;
  }
}

if (!customElements.get('virtual-scroller')) {
  customElements.define('virtual-scroller', VirtualScroller);
}
