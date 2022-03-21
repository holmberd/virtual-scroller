const template = document.createElement('template');
const listItemSheet = new CSSStyleSheet();
listItemSheet.replaceSync(`
  :host {
    display: block;
    position: relative;
    overflow: scroll;
    overflow-x: hidden;
    border: 1px solid black;
    height: 390px;
    width: 300px;
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

    this.rowFactory = null;
    this.getRowHeight = null;

    this._clientHeightCache = 0;

    this.visibleRowsOffset = 3;
    this.observer = null;
    this._rowCount = 0;

    this.lastScrollPosition = 0;
    this.visibleRowsStartIndex = 0;
    this.visibleRowsStopIndex = 0;
  }

  set rowCount(rows) {
    this._rowCount = rows;
  }

  get rowCount() {
    return this._rowCount;
  }

  set clientHeightCache(value) {
    this._clientHeightCache = value;
    this.halfClientHeight = Math.floor(value / 2);
  }

  get clientHeightCache() {
    return this._clientHeightCache;
  }

  // Provider?
  setRowHeightCalculator(fn) {
    this.getRowHeight = fn;
    const [startIndex, stopIndex] = this.calcVisibleRowIndexes();
    this.updateVisibleRowIndexes(startIndex, stopIndex);
  }

  setRowFactory(fn) {
    this.rowFactory = fn;
  }

  calcVisibleRowIndexes(scrollTop = this.scrollTop) {
    // TODO: Optimize...
    let startIndex = 0;
    for (let totalHeight = 0; startIndex < this.rowCount; startIndex++) {
      totalHeight += this.getRowHeight(startIndex);
      if (totalHeight > scrollTop) {
        break;
      }
    }

    let stopIndex = startIndex;
    for (let totalHeight = 0; stopIndex < this.rowCount; stopIndex++) {
      totalHeight += this.getRowHeight(stopIndex);
      if (totalHeight > this.clientHeightCache) {
        break;
      }
    }

    return [
      startIndex,
      stopIndex,
    ];
  }

  updateVisibleRowIndexes(startIndex, stopIndex) {
    if (this.visibleRowsStartIndex === startIndex && this.visibleRowsStopIndex === stopIndex) {
      return;
    }

    this.visibleRowsStartIndex = startIndex;
    this.visibleRowsStopIndex = stopIndex;

    const offsetStartIndex = startIndex === 0
      ? 0 : startIndex - this.visibleRowsOffset >= 0
      ? startIndex - this.visibleRowsOffset : 0 ;
    const offsetStopIndex = stopIndex === 0
      ? 0 : stopIndex + this.visibleRowsOffset < this.rowCount
      ? stopIndex + this.visibleRowsOffset : this.rowCount;

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

  calcRowsHeight(startIndex, stopIndex) {
    let rowsHeight = 0;
    for (let rowIndex = startIndex; rowIndex < stopIndex; rowIndex++) {
      rowsHeight += this.getRowHeight(rowIndex)
    }
    return rowsHeight;
  }

  calcOverflow(startIndex, stopIndex) {
    const aboveVisibleRowsHeight = this.calcRowsHeight(0, startIndex);
    const belowVisibleRowsHeight = this.calcRowsHeight(stopIndex + 1, this.rowCount);
    return [aboveVisibleRowsHeight, belowVisibleRowsHeight];
  }

  // render() {
  //   const [startIndex, stopIndex] = this.calcVisibleRowIndexes();
  //   const belowVisibleRowsHeight = this.calcRowsHeight(stopIndex, this.rowCount - 1);
  //   this.setBottomOverflowHeight(belowVisibleRowsHeight);
  //   this.renderRows(startIndex, stopIndex);
  //   this.updateVisibleRowIndexes(startIndex, stopIndex);
  // }

  // renderRows(startIndex, stopIndex) {
  //   let fragment = document.createDocumentFragment();
  //   for (let i = startIndex; i <= stopIndex; i++) {
  //     const rowElement = this.rowFactory(i);
  //     this.visibleElementsMap.set(rowElement, i);
  //     fragment.appendChild(rowElement);
  //   }
  //   this.appendChild(fragment);
  //   fragment = null;
  // }

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
  // bring top or bottom row fully inside or outside visible view.
  calcScrollThresholds(scrollDir = ScrollDir.DOWN) {
    // Scroll at top case.
    if (!this.scrollTop) {
      const visibleRowsHeight = this.calcRowsHeight(
        this.visibleRowsStartIndex,
        this.visibleRowsStopIndex
      );
      return [0, visibleRowsHeight - this.clientHeightCache]; // TODO: store clientHeight.
    }

    const notVisibleTopRowsHeight = this.calcRowsHeight(0, this.visibleRowsStartIndex - 1);
    const firstVisibleRowTopOffset = this.scrollTop - notVisibleTopRowsHeight;
    const visibleRowsHeight = this.calcRowsHeight(
      this.visibleRowsStartIndex,
      this.visibleRowsStopIndex
    );
    const lastVisibleRowBottomOffset = visibleRowsHeight - this.clientHeightCache - firstVisibleRowTopOffset;

    if (scrollDir === ScrollDir.UP) {
      return [firstVisibleRowTopOffset, this.getRowHeight(this.visibleRowsStopIndex) - lastVisibleRowBottomOffset];
    }

    const topScrollThreshold = this.getRowHeight(this.visibleRowsStartIndex) - firstVisibleRowTopOffset;
    return [topScrollThreshold, lastVisibleRowBottomOffset];
  }

  // calcBottomRowsToAdd(height) {
  //   let startIndex = this.visibleRowsStopIndex + 1;
  //   let stopIndex = startIndex;
  //   let totalRowsHeight = 0;

  //   for (let i = startIndex; i < this.rowCount; i++) {
  //     totalRowsHeight += this.getRowHeight(i);
  //     rowIndexes.push(i);
  //     if (totalRowsHeight > height) {
  //       stopIndex = i;
  //       break;
  //     }
  //   }

  //   return {
  //     range: [startIndex, stopIndex],
  //     totalHeight: totalRowsHeight,
  //     count: (stopIndex - (this.visibleRowsStopIndex + 1)) + 1,
  //   };
  // }

  connectedCallback() {
    this.clientHeightCache = this.clientHeight; // Cache this for calculations.
    this.lastScrollPosition = this.scrollTop;
    this.setRowHeightCalculator(() => 0);

    const handleScroll = (e) => {
      const scrollDistanceFromTop = this.scrollTop;
      const scrollDistance = scrollDistanceFromTop - this.lastScrollPosition;
      const isScrollDirDown = scrollDistance > 0;

      const [
        topThreshold,
        bottomThreshold
      ] = this.calcScrollThresholds(isScrollDirDown ? ScrollDir.DOWN : ScrollDir.UP);

      if (bottomThreshold < 0 || topThreshold < 0) {
        const [startIndex, stopIndex] = this.calcVisibleRowIndexes(scrollDistanceFromTop);
        this.updateVisibleRowIndexes(startIndex, stopIndex);
      }

      this.lastScrollPosition = this.scrollTop;
    };

    // const throttledHandleScroll = throttle(handleScroll, 5);

    this.addEventListener('scroll', handleScroll);

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

  // show() {
  //   template.innerHTML = '<slot></slot>'
  //   this.shadowRoot.appendChild(document.importNode(template.content, true));
  // }

  disconnectedCallback() {
    // this.observer && this.observer.disconnect();
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
