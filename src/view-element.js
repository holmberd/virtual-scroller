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

  renderRows() {
    const [startIndex, stopIndex] = this.calcVisibleRowIndexes();
    const belowVisibleRowsHeight = this.calcRowsHeight(stopIndex, this.rowCount - 1);
    this.setBottomOverflowHeight(belowVisibleRowsHeight);
    this.dispatchEvent(
      new CustomEvent(Event.VISIBLE_RANGE_CHANGE, {
        detail: {
          startIndex,
          stopIndex,
        },
        bubbles: true,
      })
    );
  }

  setBottomOverflowHeight(height) {
    const bottomOverflowElement = this.shadowRoot.querySelector('#bottom-overflow');
    bottomOverflowElement.style.height = `${height}px`;
  }

  calcVisibleRowIndexes() {
    this.visibleRowsStartIndex = this.visibleRowsStopIndex;

    let totalRowHeight = 0;
    let stopIndex = 0;
    const clientHeight = this.clientHeight;
    for (let rowCounter = this.rowCount; rowCounter > 0; rowCounter--) {
      totalRowHeight += this.getRowHeight(stopIndex);
      if (totalRowHeight > clientHeight) {
        break;
      }
      stopIndex++;

      if (stopIndex > 20) {
        break;
      }
    }

    this.visibleRowsStopIndex = stopIndex;

    // this.events.emit(
    //   Event.VISIBLE_ROWS_INDEX_CHANGE,
    //   this.visibleRowsStartIndex,
    //   this.visibleRowsStopIndex
    // );
    return [this.visibleRowsStartIndex, this.visibleRowsStopIndex];
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
      // console.log('distance', this.scrollTop - this.lastScrollPosition);
      this.lastScrollPosition = this.scrollTop;
      const scrollThresholds = this.calcScrollThresholds()
      console.log('scrollThresholds', scrollThresholds);
      // this.calcVisibleRowIndexes();
    };

    const throttledHandleScroll = throttle(handleScroll, 100);

    this.addEventListener('scroll', throttledHandleScroll);

    // 1. Get total number of row-elements.
    // 2. Get height of element and save scrollTop position.
    // 3. Calculate visible index by calling onGetRowHeight() for each index until > height + buffer.
    // 4. Call onRenderRows() with visible index to render row-elements in list.

    // 5. Register onScroll listener.
    // 6. On scroll-event calculate scrolling distance, (last saved scroll position - new scrollTop position).
      // 6a. Calculate number of new rows to render
      // 6b. Call onGetRowHeight() until > scrolling distance + buffer.
      // 6c. Call onRenderRows() with new index to render new row-elements in list.

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
