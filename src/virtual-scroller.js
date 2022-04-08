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

    this._visibleStartIndex = 0;
    this._visibleStopIndex = 0;
    this._offsetVisibleIndex = 0;
    this._itemCount = 0;
    this._getItemHeight = () => 0;
    this._itemsScrollIndex = [];
    this._lastScrollOffset = 0;
    this._clientHeightCache = null;
    this._resizeObserver = null;
  }

  get height() {
    return this._clientHeightCache ?? this.clientHeight;
  }

  set height(value) {
    this._clientHeightCache = value;
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
  init(itemCount, getItemHeight, offsetVisibleIndex = 0) {
    this.itemCount = itemCount;
    this._getItemHeight = getItemHeight;
    this.offsetVisibleIndex = offsetVisibleIndex;
    this.resetItemsScrollIndex();
  }

  /**
   * @emits visible-range-change
   */
  update(scrollTopOffset) {
    const [startIndex, stopIndex] = calcVisibleItems(
      this._itemsScrollIndex,
      this.height,
      scrollTopOffset ?? this.scrollTop
    );

    if (this._visibleStartIndex === startIndex && this._visibleStopIndex === stopIndex) {
      return;
    }

    this.setVisibleItemIndexes(startIndex, stopIndex);
    const [offsetStartIndex, offsetStopIndex] = this.calcOffsetItemIndexes(startIndex, stopIndex);
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

  setVisibleItemIndexes(startIndex, stopIndex) {
    this._visibleStartIndex = startIndex;
    this._visibleStopIndex = stopIndex;
  }

  calcOffsetItemIndexes(startIndex, stopIndex) {
    const offsetStartIndex = Math.max(0, startIndex - this.offsetVisibleIndex);
    const offsetStopIndex = Math.min(Math.max(0, this.itemCount - 1), stopIndex + this.offsetVisibleIndex);
    return [offsetStartIndex, offsetStopIndex];
  }

  resetItemsScrollIndex() {
    this._itemsScrollIndex = buildItemsScrollIndex(this.itemCount, this._getItemHeight);
    this.update();
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
      this._itemsScrollIndex,
      this.height,
      this._visibleStartIndex,
      this._visibleStopIndex,
      isScrollDirDown ? ScrollDir.DOWN : ScrollDir.UP,
      scrollTopOffset,
    );

    if (bottomThreshold < 0 || topThreshold < 0) {
      this.update(scrollTopOffset);
    }
  }

  handleResize() {
    this.height = this.clientHeight;
    this.update();
  }

  updateScrollOverflow(startIndex, stopIndex) {
    const [topOverflowHeight, bottomOverflowHeight] = calcScrollOverflow(
      this._itemsScrollIndex,
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
