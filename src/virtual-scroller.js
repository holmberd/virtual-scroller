import {
  ScrollDir,
  buildItemsScrollIndex,
  calcVisibleItems,
  calcScrollThresholds,
  calcScrollOverflow,
} from './vertical-virtualization';
import { debounce } from './utils';

const template = document.createElement('template');
/* const listItemSheet = new CSSStyleSheet();
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
`); */

template.innerHTML = `
  <style>
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
  </style>

  <div id='top-overflow'></div>
  <slot></slot>
  <div id='bottom-overflow'></div>
`;

export const VISIBLE_RANGE_CHANGE_EVENT = 'visible-range-change';

export default class VirtualScroller extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.appendChild(document.importNode(template.content, true));
    // shadowRoot.adoptedStyleSheets = [listItemSheet];

    this.visibleStartIndex = 0;
    this.visibleStopIndex = 0;

    this._offsetVisibleIndex = 0;
    this._itemCount = 0;
    this._itemsScrollIndex = [];
    this._lastScrollOffset = 0;
    this._clientHeightCache = 0;
    this._calcItemHeight = () => 0;
    this._resizeObserver = null;
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

  get itemCount() {
    return this._itemCount;
  }

  set itemCount(value) {
    this._itemCount = value;
  }

  get offsetVisibleIndex() {
    return this._offsetVisibleIndex;
  }

  set offsetVisibleIndex(value) {
    this._offsetVisibleIndex = value;
  }

  onVisibleRangeChange(callback) {
    this.addEventListener(VISIBLE_RANGE_CHANGE_EVENT, callback);
  }

  connectedCallback() {

    // Cache clientHeight for future for calculations to prevent reflow.
    this.height = this.clientHeight;
    this._lastScrollOffset = this.scrollTop;

    // If we needed to throttle this, e.g. 1000/60 = 16 ms at 60fps, ensure we get the last event.
    this.addEventListener('scroll', this.handleScroll);

    // const debouncedHandleResize = debounce(this.handleResize.bind(this));
    // this._resizeObserver = new ResizeObserver(debouncedHandleResize);
    // this._resizeObserver.observe(this);
  }

  disconnectedCallback() {
    this.removeEventListener('scroll', this.handleScroll)
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
  }

  /**
   * @public
   */
  init(itemCount, calcItemHeight, offsetVisibleIndex = 0) {
    this.itemCount = itemCount;
    this.calcItemHeight = calcItemHeight;
    this.offsetVisibleIndex = offsetVisibleIndex;
    this.resetItemsScrollIndex();
  }

  /**
   * @public
   */
  update() {
    const [startIndex, stopIndex] = calcVisibleItems(
      this.itemsScrollIndex,
      this.height,
      this.scrollTop
    );
    this.updateVisibleItemIndexes(startIndex, stopIndex);
  }

  resetItemsScrollIndex() {
    this.itemsScrollIndex = buildItemsScrollIndex(this.itemCount, this.calcItemHeight);
    this.update();
  }

  /**
   * @emits visibleRangeChange
   */
  updateVisibleItemIndexes(startIndex, stopIndex) {
    if (this.visibleStartIndex === startIndex && this.visibleStopIndex === stopIndex) {
      return;
    }
    this.visibleStartIndex = startIndex;
    this.visibleStopIndex = stopIndex;

    const offsetStartIndex = Math.max(0, startIndex - this.offsetVisibleIndex);
    const offsetStopIndex = Math.min(Math.max(0, this.itemCount - 1), stopIndex + this.offsetVisibleIndex);

    this.updateScrollOverflow(offsetStartIndex, offsetStopIndex);

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

  handleScroll(e) {
    const scrollTopOffset = this.scrollTop;
    if (scrollTopOffset === this._lastScrollOffset) {
      return;
    }
    const scrollDistance = scrollTopOffset - this._lastScrollOffset;
    const isScrollDirDown = scrollDistance > 0;
    this._lastScrollOffset = scrollTopOffset;

    // TODO: Any point in memoizing calls below?
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
        this.itemsScrollIndex,
        this.height,
        scrollTopOffset
      );
      this.updateVisibleItemIndexes(startIndex, stopIndex);
    }
  }

  handleResize() {
    this.height = this.clientHeight;
    this.update();
  }

  updateScrollOverflow(startIndex, stopIndex) {
    const [topOverflowHeight, bottomOverflowHeight] = calcScrollOverflow(
      this.itemsScrollIndex,
      startIndex,
      stopIndex
    );
    this.setTopOverflowHeight(topOverflowHeight);
    this.setBottomOverflowHeight(bottomOverflowHeight);
  }

  setBottomOverflowHeight(height) {
    const bottomOverflowElement = this.shadowRoot.querySelector('#bottom-overflow');
    bottomOverflowElement.style.height = `${Math.max(0, height)}px`;
  }

  setTopOverflowHeight(height) {
    const topOverflowElement = this.shadowRoot.querySelector('#top-overflow');
    topOverflowElement.style.height = `${Math.max(0, height)}px`;
  }
}

if (!customElements.get('virtual-scroller')) {
  customElements.define('virtual-scroller', VirtualScroller)
}
