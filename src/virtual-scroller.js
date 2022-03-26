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
    this.totalItemsHeight = 0;
    this.visibleOffset = 0;
    this.observer = null;
    this.lastScrollPosition = 0;
    this.visibleStartIndex = 0;
    this.visibleStopIndex = 0;
    this.clientHeightCache = 0;
    this._itemCount = 0;
  }

  // TODO: Update visible indexes when updated.
  // set itemCount(items) {
  //   this._itemCount = items;
  // }

  // get itemCount() {
  //   return this._itemCount;
  // }

  init(itemCount, getItemHeight) {
    this.itemCount = itemCount;
    this.getItemHeight = getItemHeight;
    const [startIndex, stopIndex] = this.calcVisibleItems();
    this.updateVisibleItemIndexes(startIndex, stopIndex);

    // Calculate and store this after initial render,
    // since calcVisibleItems is cheap when scroll is at top.
    this.itemsHeightIndex = this.buildItemsHeightIndex(itemCount);
    // this.totalItemsHeight = this.calcItemsHeight(0, this.itemCount);
  }

  buildItemsHeightIndex(itemCount) {
    const itemsHeightCache = [];
    for (let i = 0; i < itemCount; i++) {
      if (!i) {
        itemsHeightCache[i] = this.getItemHeight(i);
        continue;
      }
      itemsHeightCache[i] = itemsHeightCache[i - 1] + this.getItemHeight(i);
    }

    return itemsHeightCache;
  }

  resetItemsHeightIndex() {
    this.itemsHeightIndex = this.createItemsHeightIndex(this.itemCount, this.getItemHeight);
  }

  connectedCallback() {
    this.clientHeightCache = this.clientHeight; // Cache this for calculations.
    this.lastScrollPosition = this.scrollTop;

    const throttledHandleScroll = throttle(this.handleScroll.bind(this), 5);

    this.addEventListener('scroll', this.handleScroll.bind(this));

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

  handleScroll(e) {
    const scrollTopOffset = this.scrollTop;
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

  // Returns thresholds for scrolldistance required to
  // bring top or bottom row/item fully inside or outside visible view.
  calcScrollThresholds(scrollDir = ScrollDir.DOWN, scrollTopOffset) {
    // Initial bottom scroll case.
    if (!scrollTopOffset && scrollDir === ScrollDir.DOWN) {
      const visibleItemsHeight = this.calcItemsHeight(
        this.visibleStartIndex,
        this.visibleStopIndex
      );
      return [0, visibleItemsHeight - this.clientHeightCache]; // TODO: store clientHeight.
    }

    const coveredTopItemsHeight = this.calcItemsHeight(0, this.visibleStartIndex);
    const firstVisibleItemTopOffset = scrollTopOffset - coveredTopItemsHeight;
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

  // TODO(dag): write scroll tests (replace/append items, no need to optimize).
  calcVisibleItems(scrollTop = this.scrollTop) {
    // Initial case when scrollbar is at the top.
    if (!scrollTop) {
      let startIndex = stopIndex = 0;
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

    // Otherwise find startIndex using binary-search and itemsHeightIndex.
    const startIndex = bSearch(this.itemsHeightIndex, height => height > scrollTop);
    const stopIndex = bSearch(
      this.itemsHeightIndex,
      height => height > scrollTop + this.clientHeightCache,
      startIndex
    );

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

// function bSearch2(array, pred, startOffset = -1) {
//   let start = startOffset;
//   let end = array.length;
//   while (1 + start < end) {
//     const mid = start + ((end - start) >> 1);
//     if (pred(array[mid])) {
//       end = mid;
//     } else {
//       start = end;
//     }
//   }
//   return end;
// }
