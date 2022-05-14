import {
  Virtualization,
  getScrollWindowLength,
  getScrollOffset,
  getVisibleItems,
  getScrollOverflow,
  getScrollThresholds,
  buildItemsScrollOffsetIndex,
} from './virtualization';
import { debounce } from './utils';

export { Virtualization } from './virtualization';
export const VISIBLE_RANGE_CHANGE_EVENT = 'visible-range-change';
const RESIZE_OBSERVER_DEBOUNCE_MS = 20;

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
      display: block;
      position: relative;
      contain: content;
      overflow: auto;
    }
    :host, ::slotted(*) {
      box-sizing: border-box;
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

export default class VirtualScroller extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.appendChild(document.importNode(template.content, true));

    this._visibleStartIndex = 0;
    this._visibleStopIndex = 0;
    this._offsetVisibleIndex = 0;
    this._lastUpdate = new LastUpdate();
    this._itemCount = 0;
    this._itemsScrollOffsetIndex = [];
    this._lastScrollOffset = 0;
    this._clientHeightCache = null;
    this._clientWidthCache = null;
    this._resizeObserver = null;
    this._enableResizeObserver = false;
    this._beforeOverflowElement = null;
    this._afterOverflowElement = null;
    this._disableVirtualization = false;
    this._virtualization = Virtualization.VERTICAL;
    this._initialized = false;
    this._getItemLength = () => 0;
    this._isConnected = false;
  }

  get _height() {
    return this._clientHeightCache ?? this.clientHeight;
  }

  set _height(value) {
    this._clientHeightCache = value;
  }

  get _width() {
    return this._clientWidthCache ?? this.clientWidth;
  }

  set _width(value) {
    this._clientWidthCache = value;
  }

  get _scrollWindowLength() {
    return getScrollWindowLength(this._virtualization, this._width, this._height);
  }

  get getItemLength() {
    return this._getItemLength;
  }

  set getItemLength(cb) {
    if (cb === this._getItemLength) {
      return;
    }
    this._getItemLength = cb;
    this._updateItemsScrollOffsetIndex();
    this._update();
  }

  get itemCount() {
    return this._itemCount;
  }

  set itemCount(value) {
    if (value < 0) {
      throw Error('Item count must be >= 0');
    }
    if (this._itemCount === value) {
      return;
    }
    this._itemCount = value;
    this._updateItemsScrollOffsetIndex();
    this._update();
  }

  get offsetVisibleIndex() {
    return this._offsetVisibleIndex;
  }

  set offsetVisibleIndex(value) {
    if (value < 0) {
      throw Error('Offset visible index must be >= 0');
    }
    if (this._offsetVisibleIndex === value) {
      return;
    }
    this._offsetVisibleIndex = value;
    this._update();
  }

  get enableResizeObserver() {
    return this._enableResizeObserver;
  }

  set enableResizeObserver(enable) {
    if (enable) {
      this._connectResizeObserver();
    } else {
      this._disconnectResizeObserver();
    }
    this._enableResizeObserver = Boolean(enable);
  }

  get disableVirtualization() {
    return this._disableVirtualization;
  }

  set disableVirtualization(value) {
    this._disableVirtualization = Boolean(value);
  }

  get virtualization() {
    return this._virtualization;
  }

  _getScrollOffset() {
    return getScrollOffset(this._virtualization, this.scrollLeft, this.scrollTop);
  }

  connectedCallback() {
    if (!this.isConnected) {
      return;
    }
    // Store client dimensions for future calculations to prevent reflow.
    this._height = this.clientHeight;
    this._width = this.clientWidth;
    this._lastScrollOffset = this._getScrollOffset();
    this._beforeOverflowElement = this.shadowRoot.querySelector('#before-overflow');
    this._afterOverflowElement = this.shadowRoot.querySelector('#after-overflow');

    // If we needed to throttle this, e.g. 1000/60 = 16 ms at 60fps, ensure we get the last event.
    this.addEventListener('scroll', this._handleScroll.bind(this));

    if (this.enableResizeObserver) {
      this._connectResizeObserver();
    }
    if (this._initialized) {
      this._update();
    }
  }

  disconnectedCallback() {
    this.removeEventListener('scroll', this._handleScroll);
    this._disconnectResizeObserver();
  }

  /**
   * @public
   */
  init(itemCount, getItemLength, {
    offsetVisibleIndex = 0,
    virtualization = Virtualization.VERTICAL,
    enableResizeObserver = false,
  } = {}) {
    if (!Object.values(Virtualization).includes(virtualization)) {
      throw Error(`Invalid virtualization. Must be one of: ${Object.values(Virtualization)}`);
    }

    this._itemCount = itemCount;
    this._offsetVisibleIndex = offsetVisibleIndex;
    this._virtualization = virtualization;
    this._getItemLength = getItemLength;
    this.enableResizeObserver = enableResizeObserver;
    this._updateItemsScrollOffsetIndex();

    this._initialized = true;
    this._update();
  }

  reset() {
    this.scrollTop = 0;
    this.scrollLeft = 0;
  }

  _updateItemsScrollOffsetIndex() {
    this._itemsScrollOffsetIndex = buildItemsScrollOffsetIndex(
      this.itemCount,
      this.getItemLength,
    );
  }

  /**
   * @emits visible-range-change
   */
  _update(scrollOffset) {
    if (!this.isConnected || !this._initialized) {
      return;
    }

    if (!this.itemCount) {
      const startIndex = 0;
      const stopIndex = 0;
      this._setVisibleItemIndexes(startIndex, stopIndex);
      this._setScrollOverflow(0, 0);
      this._lastUpdate.setUpdate(
        startIndex,
        stopIndex,
        this.offsetVisibleIndex,
        this._itemsScrollOffsetIndex
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
      this._itemsScrollOffsetIndex,
      this._scrollWindowLength,
      scrollOffset ?? this._getScrollOffset(),
    );
    const [offsetStartIndex, offsetStopIndex] = this._getOffsetItemIndexes(startIndex, stopIndex);

    if (this._lastUpdate.isEqual(
      offsetStartIndex,
      offsetStopIndex,
      this.offsetVisibleIndex,
      this._itemsScrollOffsetIndex
    )) {
      return;
    }

    this._setVisibleItemIndexes(startIndex, stopIndex);
    !this.disableVirtualization && this._updateScrollOverflow(offsetStartIndex, offsetStopIndex);

    this._lastUpdate.setUpdate(
      offsetStartIndex,
      offsetStopIndex,
      this.offsetVisibleIndex,
      this._itemsScrollOffsetIndex
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

  _setVisibleItemIndexes(startIndex, stopIndex) {
    this._visibleStartIndex = startIndex;
    this._visibleStopIndex = stopIndex;
  }

  _getOffsetItemIndexes(startIndex, stopIndex) {
    const offsetStartIndex = Math.max(0, startIndex - this.offsetVisibleIndex);
    const offsetStopIndex = Math.min(Math.max(0, this.itemCount - 1), stopIndex + this.offsetVisibleIndex);
    return [offsetStartIndex, offsetStopIndex];
  }

  _handleScroll() {
    const scrollOffset = this._getScrollOffset();
    if (scrollOffset === this._lastScrollOffset) {
      return;
    }
    const scrollDistance = scrollOffset - this._lastScrollOffset;
    this._lastScrollOffset = scrollOffset;

    const [
      firstThreshold,
      secondThreshold
    ] = getScrollThresholds(
      this._itemsScrollOffsetIndex,
      this._scrollWindowLength,
      this._visibleStartIndex,
      this._visibleStopIndex,
      scrollOffset,
      scrollDistance,
    );

    if (secondThreshold < 0 || firstThreshold < 0) {
      this._update(scrollOffset);
    }
  }

  _connectResizeObserver() {
    if (this._resizeObserver) {
      return;
    }
    const debouncedHandleResize = debounce(this._handleResize.bind(this), RESIZE_OBSERVER_DEBOUNCE_MS);
    this._resizeObserver = new ResizeObserver(debouncedHandleResize);
    this._resizeObserver.observe(this);
  }

  _disconnectResizeObserver() {
    if (!this._resizeObserver) {
      return;
    }
    this._resizeObserver.disconnect();
    this._resizeObserver = null;
  }

  _handleResize() {
    this._height = this.clientHeight;
    this._width = this.clientWidth;
    this._update();
  }

  _updateScrollOverflow(startIndex, stopIndex) {
    const [beforeScrollLength, afterScrollLength] = getScrollOverflow(
      this._itemsScrollOffsetIndex,
      startIndex,
      stopIndex
    );

    this._setScrollOverflow(beforeScrollLength, afterScrollLength);
  }

  _setScrollOverflow(beforeScrollLength, afterScrollLength) {
    const dimension = Virtualization.isVertical(this.virtualization) ? 'height' : 'width';
    this._beforeOverflowElement.style[dimension] = `${Math.max(0, beforeScrollLength)}px`;
    this._afterOverflowElement.style[dimension] = `${Math.max(0, afterScrollLength)}px`;
  }
}

if (!customElements.get('virtual-scroller')) {
  customElements.define('virtual-scroller', VirtualScroller);
}
