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

const viewElementItem = 'view-element-item';

const Event = {
  VISIBLE_RANGE_CHANGE: 'visibleRangeChange',
};

// Element callback fires when it needs new elements to render on scroll.

export default class ViewElement extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.appendChild(document.importNode(template.content, true));
    shadowRoot.adoptedStyleSheets = [listItemSheet];

    this.visibleRowsOffset = 1;
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

  setRowHeightCalculator(fn) {
    this.getRowHeight = fn;
    this.renderRows();
  }

  calcRowsHeight(startIndex, stopIndex) {
    let rowsHeight = 0;
    for (let rowIndex = startIndex; rowIndex <= stopIndex; rowIndex++) {
      rowsHeight += this.getRowHeight(rowIndex)
    }
    return rowsHeight;
  }

  updateVisibleRowIndexes(startIndex, stopIndex) {
    if (this.visibleRowsStartIndex === startIndex && this.visibleRowsStopIndex === stopIndex) {
      return;
    }

    this.visibleRowsStartIndex = startIndex;
    this.visibleRowsStopIndex = stopIndex;

    this.dispatchEvent(
      new CustomEvent(Event.VISIBLE_RANGE_CHANGE, {
        detail: {
          startIndex: startIndex === 0 ? 0 : startIndex - this.visibleRowsOffset,
          stopIndex: stopIndex === 0 ? 0 : stopIndex + this.visibleRowsOffset,
        },
        bubbles: true,
      })
    );
  }

  renderRows() {
    const [startIndex, stopIndex] = this.calcVisibleRowIndexes();
    const belowVisibleRowsHeight = this.calcRowsHeight(stopIndex, this.rowCount - 1);
    this.setBottomOverflowHeight(belowVisibleRowsHeight);
    this.updateVisibleRowIndexes(startIndex, stopIndex);
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

  calcVisibleRowIndexes() {
    const clientHeight = this.clientHeight;
    const scrollTop = this.scrollTop;


    // TODO: Replace with binary search (optimization).
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

  calcScrollThresholds() {
    // Scroll at top case.
    if (!this.scrollTop) {
      const visibleRowsHeight = this.calcRowsHeight(
        this.visibleRowsStartIndex,
        this.visibleRowsStopIndex
      );
      return [0, visibleRowsHeight - this.clientHeight]; // TODO: store clientHeight.
    }

    const aboveVisibleRowsHeight = this.calcRowsHeight(0, this.visibleRowsStartIndex - 1);
    const visibleRowsTopOffset = this.scrollTop - aboveVisibleRowsHeight;

    const visibleRowsHeight = this.calcRowsHeight(
      this.visibleRowsStartIndex,
      this.visibleRowsStopIndex
    );

    const visibleRowsBottomOffset = visibleRowsHeight - this.clientHeight - visibleRowsTopOffset;

    return [visibleRowsTopOffset, visibleRowsBottomOffset];
  }

  connectedCallback() {
    this.lastScrollPosition = this.scrollTop;
    this.setRowHeightCalculator(() => 0);

    const handleScroll = (e) => {
      const isDown = this.scrollTop - this.lastScrollPosition > 0;
      const [topThreshold, bottomThreshold] = this.calcScrollThresholds();

      if (isDown) {
        // Remove row top.
        if (topThreshold > this.getRowHeight(this.visibleRowsStartIndex)) {
          const topOverflowHeight = this.getTopOverflowHeight();
          const removedRowHeight = this.getRowHeight(this.visibleRowsStartIndex);
          this.setTopOverflowHeight(topOverflowHeight + removedRowHeight);
          const firstRowElement = this.firstElementChild
          firstRowElement && firstRowElement.remove();
          this.updateVisibleRowIndexes(this.visibleRowsStartIndex + 1, this.visibleRowsStopIndex);
        }

        // Add row bottom.
        if (bottomThreshold < 0) {
          const bottomOverflowHeight = this.getBottomOverflowHeight();
          const addedRowHeight = this.getRowHeight(this.visibleRowsStopIndex + 1);
          this.setBottomOverflowHeight(bottomOverflowHeight - addedRowHeight);
          this.updateVisibleRowIndexes(this.visibleRowsStartIndex, this.visibleRowsStopIndex + 1);
        }
      } else {
        // Add row top.
        if (topThreshold < 0) {
          const topOverflowHeight = this.getTopOverflowHeight();
          const addedRowHeight = this.getRowHeight(this.visibleRowsStartIndex + 1);
          this.setTopOverflowHeight(topOverflowHeight - addedRowHeight);
          this.updateVisibleRowIndexes(this.visibleRowsStartIndex - 1, this.visibleRowsStopIndex);
        }

        // Remove row bottom.
        if (bottomThreshold > this.getRowHeight(this.visibleRowsStartIndex)) {
          const topOverflowHeight = this.getTopOverflowHeight();
          const removedRowHeight = this.getRowHeight(this.visibleRowsStopIndex);
          this.setTopOverflowHeight(topOverflowHeight + removedRowHeight);
          // this.updateVisibleRowIndexes(this.visibleRowsStartIndex, this.visibleRowsStopIndex + 1);
        }

      }

      // console.log('distance', this.scrollTop - this.lastScrollPosition);
      this.lastScrollPosition = this.scrollTop;

      console.log('scrollThresholds', bottomThreshold);
      // this.calcVisibleRowIndexes();
    };

    const throttledHandleScroll = throttle(handleScroll, 100);

    this.addEventListener('scroll', throttledHandleScroll);

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

if (!customElements.get('view-element')) {
  customElements.define('view-element', ViewElement)
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
