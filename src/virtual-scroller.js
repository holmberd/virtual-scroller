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

    this.visibleElementsMap = new WeakMap();
    this.rowFactory = null;

    this.visibleRowsOffset = 3;
    this.observer = null;
    this._rowCount = 0;
    this.getRowHeight = null;
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

  // Provider?
  setRowHeightCalculator(fn) {
    this.getRowHeight = fn;
    const [startIndex, stopIndex] = this.calcVisibleRowIndexes();
    this.updateVisibleRowIndexes(startIndex, stopIndex);
  }

  setRowFactory(fn) {
    this.rowFactory = fn;
  }

  calcVisibleRowIndexes() {
    const clientHeight = this.clientHeight;
    const scrollTop = this.scrollTop;


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
      if (totalHeight > clientHeight) {
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

  calcOverflow(startIndex, stopIndex) {
    const aboveVisibleRowsHeight = this.calcRowsHeight(0, startIndex);
    const belowVisibleRowsHeight = this.calcRowsHeight(stopIndex + 1, this.rowCount);
    return [aboveVisibleRowsHeight, belowVisibleRowsHeight];
  }

  calcRowsHeight(startIndex, stopIndex) {
    let rowsHeight = 0;
    for (let rowIndex = startIndex; rowIndex < stopIndex; rowIndex++) {
      rowsHeight += this.getRowHeight(rowIndex)
    }
    return rowsHeight;
  }

  render() {
    const [startIndex, stopIndex] = this.calcVisibleRowIndexes();
    const belowVisibleRowsHeight = this.calcRowsHeight(stopIndex, this.rowCount - 1);
    this.setBottomOverflowHeight(belowVisibleRowsHeight);

    this.renderRows(startIndex, stopIndex);

    this.updateVisibleRowIndexes(startIndex, stopIndex);
  }

  renderRows(startIndex, stopIndex) {
    let fragment = document.createDocumentFragment();
    for (let i = startIndex; i <= stopIndex; i++) {
      const rowElement = this.rowFactory(i);
      this.visibleElementsMap.set(rowElement, i);
      fragment.appendChild(rowElement);
    }

    this.appendChild(fragment);
    fragment = null;
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
  // bring top or bottom row fully inside or outside visible view.
  calcScrollThresholds(scrollDir = ScrollDir.DOWN) {
    // Scroll at top case.
    if (!this.scrollTop) {
      const visibleRowsHeight = this.calcRowsHeight(
        this.visibleRowsStartIndex,
        this.visibleRowsStopIndex
      );
      return [0, visibleRowsHeight - this.clientHeight]; // TODO: store clientHeight.
    }

    const notVisibleTopRowsHeight = this.calcRowsHeight(0, this.visibleRowsStartIndex - 1);
    const firstVisibleRowTopOffset = this.scrollTop - notVisibleTopRowsHeight;
    const visibleRowsHeight = this.calcRowsHeight(
      this.visibleRowsStartIndex,
      this.visibleRowsStopIndex
    );
    const lastVisibleRowBottomOffset = visibleRowsHeight - this.clientHeight - firstVisibleRowTopOffset;

    if (scrollDir === ScrollDir.UP) {
      return [firstVisibleRowTopOffset, this.getRowHeight(this.visibleRowsStopIndex) - lastVisibleRowBottomOffset];
    }

    const topScrollThreshold = this.getRowHeight(this.visibleRowsStartIndex) - firstVisibleRowTopOffset;
    return [topScrollThreshold, lastVisibleRowBottomOffset];
  }

  // removeTopRowsWithinHeight(height) {
  //   const removedCount = 0;
  //   const removedRowHeight = this.getRowHeight(this.visibleRowsStartIndex);
  //   for (
  //     let index = this.visibleRowsStartIndex,
  //     totalRowsHeight = 0;
  //     totalRowsHeight <= height;
  //     index++
  //   ) {
  //     totalRowsHeight += this.getRowHeight(index);
  //     if (totalRowsHeight)
  //   }
  // }

  addBottomRowsWithinHeight(height) {
    let stopIndex = this.visibleRowsStopIndex + 1;
    let totalRowsHeight = 0;

    for (let i = this.visibleRowsStopIndex + 1; i < this.rowCount; i++) {
      totalRowsHeight += this.getRowHeight(i);
      if (totalRowsHeight > height) {
        stopIndex = i;
        break;
      }
    }

    this.setBottomOverflowHeight(this.getBottomOverflowHeight() - totalRowsHeight);
    this.renderRows(this.visibleRowsStopIndex + 1, stopIndex);
    return (stopIndex - (this.visibleRowsStopIndex + 1)) + 1;
  }

  calcBottomRowsToAdd(height) {
    let startIndex = this.visibleRowsStopIndex + 1;
    let stopIndex = startIndex;
    let totalRowsHeight = 0;

    for (let i = startIndex; i < this.rowCount; i++) {
      totalRowsHeight += this.getRowHeight(i);
      rowIndexes.push(i);
      if (totalRowsHeight > height) {
        stopIndex = i;
        break;
      }
    }

    return {
      range: [startIndex, stopIndex],
      totalHeight: totalRowsHeight,
      count: (stopIndex - (this.visibleRowsStopIndex + 1)) + 1,
    };
  }

  // calcTopRowsToRemove(height) {
  //   let stopIndex = this.visibleRowsStartIndex - 1;
  //   let
  //   let totalRowsHeight = 0;

  //   for (let i = this.visibleRowsStartIndex - 1; i >= 0; i--) {
  //     totalRowsHeight += this.getRowHeight(i);
  //     if (totalRowsHeight > height) {

  //     }
  //   }
  // }


  connectedCallback() {
    this.lastScrollPosition = this.scrollTop;
    this.setRowHeightCalculator(() => 0);

    const handleScroll = (e) => {
      const scrollDistance = this.scrollTop - this.lastScrollPosition;
      const abstScrollDistance = Math.abs(scrollDistance);
      const isScrollDirectionDown = scrollDistance > 0;

      if (isScrollDirectionDown) {
        const [topThreshold, bottomThreshold] = this.calcScrollThresholds(ScrollDir.DOWN);
        // console.log('thresholds', topThreshold, bottomThreshold);

        // Add bottom rows.
        if (bottomThreshold < 0) {
          // const { count, totalHeight } = this.calcBottomRowsToAdd(Math.abs(bottomThreshold));
          // this.updateVisibleRowIndexes(this.visibleRowsStartIndex, this.visibleRowsStopIndex + count);
          // this.setBottomOverflowHeight(this.getBottomOverflowHeight() - totalHeight);

          const [startIndex, stopIndex] = this.calcVisibleRowIndexes();
          this.updateVisibleRowIndexes(startIndex, stopIndex);
        }

        // Remove top rows.
        if (topThreshold < 0) {
          // const removedRowsCount = this.calcTopRowsToRemove(Math.abs(topThreshold));
          // this.updateVisibleRowIndexes(this.visibleRowsStartIndex + removedRowsCount, this.visibleRowsStopIndex);

          const [startIndex, stopIndex] = this.calcVisibleRowIndexes();
          this.updateVisibleRowIndexes(startIndex, stopIndex);
        }
      } else {
        const [topThreshold, bottomThreshold] = this.calcScrollThresholds(ScrollDir.UP);
        if (bottomThreshold < 0 || topThreshold < 0) {
          const [startIndex, stopIndex] = this.calcVisibleRowIndexes();
          this.updateVisibleRowIndexes(startIndex, stopIndex);
        }
      }

      // if (isDown) {
      //   if (topThreshold > this.getRowHeight(this.visibleRowsStartIndex)) {
      //     // Remove row top.
      //     console.log('remove top row');
      //     const topOverflowHeight = this.getTopOverflowHeight();
      //     const removedRowHeight = this.getRowHeight(this.visibleRowsStartIndex);

      //     const firstRowElement = this.firstElementChild
      //     this.setTopOverflowHeight(topOverflowHeight + removedRowHeight);
      //     firstRowElement && firstRowElement.remove();

      //     this.updateVisibleRowIndexes(this.visibleRowsStartIndex + 1, this.visibleRowsStopIndex);
      //   } else if (bottomThreshold < 0) {
      //     // Add row bottom.
      //     console.log('add bottom row');
      //     // const bottomOverflowHeight = this.getBottomOverflowHeight();
      //     // const addedRowHeight = this.getRowHeight(this.visibleRowsStopIndex + 1);
      //     // this.setBottomOverflowHeight(bottomOverflowHeight - addedRowHeight);

      //     // const newRow = this.rowFactory(this.visibleRowsStopIndex + 1);
      //     // this.appendChild(newRow);
      //     const addedRowsCount = this.addBottomRowsWithinHeight(Math.abs(scrollDistance));
      //     console.log('added', addedRowsCount);
      //     this.updateVisibleRowIndexes(this.visibleRowsStartIndex, this.visibleRowsStopIndex + addedRowsCount);
      //   }
      // } else {
      //   if (topThreshold < 0) {
      //     // Add row top.
      //     console.log('add top row');
      //     const topOverflowHeight = this.getTopOverflowHeight();
      //     const addedRowHeight = this.getRowHeight(this.visibleRowsStartIndex - 1);
      //     this.setTopOverflowHeight(topOverflowHeight - addedRowHeight);

      //     const newRow = this.rowFactory(this.visibleRowsStartIndex - 1);
      //     this.prepend(newRow);

      //     this.updateVisibleRowIndexes(this.visibleRowsStartIndex - 1, this.visibleRowsStopIndex);
      //   } else if (bottomThreshold > this.getRowHeight(this.visibleRowsStartIndex)) {
      //     // Remove row bottom.
      //     console.log('remove bottom row');
      //     const bottomOverflowHeight = this.getBottomOverflowHeight();
      //     const removedRowHeight = this.getRowHeight(this.visibleRowsStopIndex);
      //     const lastRowElement = this.lastElementChild;
      //     this.setBottomOverflowHeight(bottomOverflowHeight + removedRowHeight);
      //     lastRowElement && lastRowElement.remove();
      //     this.updateVisibleRowIndexes(this.visibleRowsStartIndex, this.visibleRowsStopIndex - 1);
      //   }
      // }

      // console.log('distance', this.scrollTop - this.lastScrollPosition);
      this.lastScrollPosition = this.scrollTop;

      // console.log('scrollThresholds', topThreshold, bottomThreshold);
      // this.calcVisibleRowIndexes();
    };

    const throttledHandleScroll = throttle(handleScroll, 5);

    this.addEventListener('scroll', handleScroll);

    // React: the index recieved in from onRenderRows() updates state which cause
    // react to render rows inside the view-element(list).
    // Without react we would just append the elements.
    // The element takes care of unmounting elements outside the visible index.

    // The more specific selector the better the performance lookup.
    // const items = [...this.querySelectorAll(`:scope > *`)];
    // console.log('items', items);

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

  show() {
    template.innerHTML = '<slot></slot>'
    this.shadowRoot.appendChild(document.importNode(template.content, true));
  }

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
