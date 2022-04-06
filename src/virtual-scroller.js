import {
  ScrollDir,
  buildItemsScrollIndex,
  calcVisibleItems,
  calcScrollThresholds,
  calcScrollOverflow,
} from './vertical-virtualization';

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

    // If we needed to throttle this, e.g. 1000/60 = 16 ms at 60fps,we need to ensure we get the last event.
    // Either with modified throttle or combination of throttle debounce
    this.addEventListener('scroll', this.handleScroll);

    // TODO: Add resizeObserver.
  }

  disconnectedCallback() {}

  /**
   * @public
   */
  // TODO: reset scrollIndex on itemcount update.
  init(itemCount, calcItemHeight) {
    this.itemCount = itemCount;
    this.calcItemHeight = calcItemHeight;
    this.itemsScrollIndex = buildItemsScrollIndex(this.itemCount, this.calcItemHeight);
    this.update();
  }

  /**
   * @public
   */
  resetItemsScrollIndex() {
    this.itemsScrollIndex = buildItemsScrollIndex(this.itemCount, this.calcItemHeight);
    this.update();
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

  /**
   * @emits visibleRangeChange
   */
  updateVisibleItemIndexes(startIndex, stopIndex) {
    if (this.visibleStartIndex === startIndex && this.visibleStopIndex === stopIndex) {
      return;
    }
    this.visibleStartIndex = startIndex;
    this.visibleStopIndex = stopIndex;

    const offsetStartIndex = Math.max(0, startIndex - this.visibleOffset);
    const offsetStopIndex = Math.min(Math.max(0, this.itemCount - 1), stopIndex + this.visibleOffset);

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

  handleScroll(e) {
    const scrollTopOffset = this.scrollTop;
    if (scrollTopOffset === this.lastScrollPosition) {
      return;
    }
    const scrollDistance = scrollTopOffset - this.lastScrollPosition;
    const isScrollDirDown = scrollDistance > 0;
    this.lastScrollPosition = scrollTopOffset;

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
