const template = document.createElement('template');
const listItemSheet = new CSSStyleSheet();
listItemSheet.replaceSync(`
  :host {
    display: block;
    position: relative;
    overflow: scroll;
    overflow-x: hidden;
    border: 1px solid black;
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

    this.getItemHeight = () => 0;
    this.visibleOffset = 3;
    this.observer = null;
    this.lastScrollPosition = 0;
    this.visibleStartIndex = 0;
    this.visibleStopIndex = 0;
    this.clientHeightCache = 0;
    this._itemCount = 0;
  }

  static get observedAttributes() {
    return ['height', 'width'];
  }

  get height() {
    return this.hasAttribute('height') && Number(this.getAttribute('height').replace('px', ''));
  }

  set height(val) {
    if (val) {
      this.setAttribute('height', val);
    } else {
      this.removeAttribute('height');
    }
  }

  get width() {
    return this.hasAttribute && this.getAttribute('width');
  }

  set width(val) {
    if (val) {
      this.setAttribute('width', val)
    } else {
      this.removeAttribute('width');
    }
  }

  // TODO: Update visible indexes when updated.
  set itemCount(items) {
    this._itemCount = items;
  }

  get itemCount() {
    return this._itemCount;
  }

  init(fn) {
    this.getItemHeight = fn;
    const [startIndex, stopIndex] = this.calcVisibleItems();
    this.updateVisibleItemIndexes(startIndex, stopIndex);
  }

  connectedCallback() {
    this.clientHeightCache = this.clientHeight; // Cache this for calculations.
    this.lastScrollPosition = this.scrollTop;

    const throttledHandleScroll = throttle(this.handleScroll, 5);

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

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'height') {
      this.style.height = newValue.includes('px') ? newValue : `${newValue}px`;
    }
    if (name === 'width') {
      this.style.width = newValue.includes('px') ? newValue : `${newValue}px`;
    }
  }

  handleScroll(e) {
    const scrollDistanceFromTop = this.scrollTop;
    const scrollDistance = scrollDistanceFromTop - this.lastScrollPosition;
    const isScrollDirDown = scrollDistance > 0;
    this.lastScrollPosition = scrollDistanceFromTop;

    const [
      topThreshold,
      bottomThreshold
    ] = this.calcScrollThresholds(isScrollDirDown ? ScrollDir.DOWN : ScrollDir.UP);

    if (bottomThreshold < 0 || topThreshold < 0) {
      const [startIndex, stopIndex] = this.calcVisibleItems(scrollDistanceFromTop);
      this.updateVisibleItemIndexes(startIndex, stopIndex);
    }
  }

  calcVisibleItems(scrollTop = this.scrollTop) {
    // TODO: Optimize...
    let startIndex = 0;
    for (let totalHeight = 0; startIndex < this.itemCount; startIndex++) {
      totalHeight += this.getItemHeight(startIndex);
      if (totalHeight > scrollTop) {
        break;
      }
    }

    let stopIndex = startIndex;
    for (let totalHeight = 0; stopIndex < this.itemCount; stopIndex++) {
      totalHeight += this.getItemHeight(stopIndex);
      if (totalHeight > this.clientHeightCache) {
        break;
      }
    }

    return [
      startIndex,
      stopIndex,
    ];
  }

  updateVisibleItemIndexes(startIndex, stopIndex) {
    if (this.visibleStartIndex === startIndex && this.visibleStopIndex === stopIndex) {
      return;
    }

    this.visibleStartIndex = startIndex;
    this.visibleStopIndex = stopIndex;

    const offsetStartIndex = startIndex === 0
      ? 0 : startIndex - this.visibleOffset >= 0
      ? startIndex - this.visibleOffset : 0 ;
    const offsetStopIndex = stopIndex === 0
      ? 0 : stopIndex + this.visibleOffset < this.itemCount
      ? stopIndex + this.visibleOffset : this.itemCount;

    const [topOverflowHeight, bottomOverflowHeight] = this.calcOverflow(offsetStartIndex, offsetStopIndex);
    this.setTopOverflowHeight(topOverflowHeight);
    this.setBottomOverflowHeight(bottomOverflowHeight);

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

  calcItemsHeight(startIndex, stopIndex) {
    let itemsHeight = 0;
    for (let itemIndex = startIndex; itemIndex < stopIndex; itemIndex++) {
      itemsHeight += this.getItemHeight(itemIndex)
    }
    return itemsHeight;
  }

  calcOverflow(startIndex, stopIndex) {
    const beforeVisibleItemsHeight = this.calcItemsHeight(0, startIndex);
    const afterVisibleItemsHeight = this.calcItemsHeight(stopIndex + 1, this.itemCount);
    return [beforeVisibleItemsHeight, afterVisibleItemsHeight];
  }

  setBottomOverflowHeight(height) {
    const bottomOverflowElement = this.shadowRoot.querySelector('#bottom-overflow');
    bottomOverflowElement.style.height = `${Math.max(0, height)}px`;
  }

  getBottomOverflowHeight() {
    const bottomOverflowElement = this.shadowRoot.querySelector('#bottom-overflow');
    return Number(bottomOverflowElement.style.height.replace('px', '')) ?? 0;
  }

  setTopOverflowHeight(height) {
    const topOverflowElement = this.shadowRoot.querySelector('#top-overflow');
    topOverflowElement.style.height = `${Math.max(0, height)}px`;
  }

  getTopOverflowHeight() {
    const topOverflowElement = this.shadowRoot.querySelector('#top-overflow');
    return Number(topOverflowElement.style.height.replace('px', '')) ?? 0;
  }

  // Returns thresholds for scrolldistance required to
  // bring top or bottom row/item fully inside or outside visible view.
  calcScrollThresholds(scrollDir = ScrollDir.DOWN) {
    // Scroll at top case.
    if (!this.scrollTop) {
      const visibleItemsHeight = this.calcItemsHeight(
        this.visibleStartIndex,
        this.visibleStopIndex
      );
      return [0, visibleItemsHeight - this.clientHeightCache]; // TODO: store clientHeight.
    }

    const coveredTopItemsHeight = this.calcItemsHeight(0, this.visibleStartIndex - 1);
    const firstVisibleItemTopOffset = this.scrollTop - coveredTopItemsHeight;
    const visibleItemsHeight = this.calcItemsHeight(
      this.visibleStartIndex,
      this.visibleStopIndex
    );
    const lastVisibleItemBottomOffset = visibleItemsHeight - this.clientHeightCache - firstVisibleItemTopOffset;

    if (scrollDir === ScrollDir.UP) {
      return [firstVisibleItemTopOffset, this.getItemHeight(this.visibleStopIndex) - lastVisibleItemBottomOffset];
    }

    const topScrollThreshold = this.getItemHeight(this.visibleStartIndex) - firstVisibleItemTopOffset;
    return [topScrollThreshold, lastVisibleItemBottomOffset];
  }
}

if (!customElements.get('virtual-scroller')) {
  customElements.define('virtual-scroller', VirtualScroller)
}

function throttle(fn, wait) {
  var time = Date.now();
  return function () {
    if ((time + wait - Date.now()) < 0) {
      fn();
      time = Date.now();
    }
  }
}
