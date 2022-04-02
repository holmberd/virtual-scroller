import {
  calcVisibleItems,
  buildItemsScrollIndex,
  calcScrollOverflow,
  calcScrollThresholds,
  calcHeightBetween,
} from './vertical-virtualization';

const CLIENT_HEIGHT = 400;
const SMALL_ITEM_HEIGHT = 50;
const LARGE_ITEM_HEIGHT = 100;
const ITEM_COUNT = 1000;
const SCROLL_HEIGHT = SMALL_ITEM_HEIGHT * (ITEM_COUNT / 2) + LARGE_ITEM_HEIGHT * (ITEM_COUNT / 2);
const SCROLL_TOP_MAX = SCROLL_HEIGHT - CLIENT_HEIGHT;
const getItemHeight = (index) => index % 2 === 0 ? SMALL_ITEM_HEIGHT : LARGE_ITEM_HEIGHT;

describe('Vertical virtualization calculation tests', () => {
  let items = [];
  let itemsScrollIndex = [];

  beforeAll(() => {
    items = Array(1000).fill(true).map((_, index) => ({ id: index }));
    itemsScrollIndex = buildItemsScrollIndex(items.length, getItemHeight)
  })

  afterAll(() => {});
  beforeEach(() => {});
  afterEach(() => {});

  it('should calculate visible items', () => {
    // Top.
    let scrollTop = 0;
    let [startIndex, stopIndex] = calcVisibleItems(itemsScrollIndex, CLIENT_HEIGHT, scrollTop);
    expect(startIndex).toBe(0);
    expect(stopIndex).toBe(5);

    scrollTop = 49;
    [startIndex, stopIndex] = calcVisibleItems(itemsScrollIndex, CLIENT_HEIGHT, scrollTop);
    expect(startIndex).toBe(0);
    expect(stopIndex).toBe(5);

    scrollTop = 50;
    [startIndex, stopIndex] = calcVisibleItems(itemsScrollIndex, CLIENT_HEIGHT, scrollTop);
    expect(startIndex).toBe(1);
    expect(stopIndex).toBe(6);

    scrollTop = 100;
    [startIndex, stopIndex] = calcVisibleItems(itemsScrollIndex, CLIENT_HEIGHT, scrollTop);
    expect(startIndex).toBe(1);
    expect(stopIndex).toBe(7);

    scrollTop = 150;
    [startIndex, stopIndex] = calcVisibleItems(itemsScrollIndex, CLIENT_HEIGHT, scrollTop);
    expect(startIndex).toBe(2);
    expect(stopIndex).toBe(7);

    // Bottom.
    scrollTop = SCROLL_TOP_MAX;
    [startIndex, stopIndex] = calcVisibleItems(itemsScrollIndex, CLIENT_HEIGHT, scrollTop);
    expect(startIndex).toBe(995);
    expect(stopIndex).toBe(999);
  });

  it('should calculate height between items', () => {
    // 50
    let startIndex = 0, stopIndex = 0;
    expect(itemsScrollIndex[0]).toBe(calcHeightBetween(itemsScrollIndex, startIndex, stopIndex));

    // 50 + 100
    startIndex = 0, stopIndex = 1;
    expect(150).toBe(calcHeightBetween(itemsScrollIndex, startIndex, stopIndex));

    // 50 + 100 + 50 + 100 + 50 + 100 = 450
    startIndex = 0, stopIndex = 5;
    expect(450).toBe(calcHeightBetween(itemsScrollIndex, startIndex, stopIndex));

    // 100 + 50 + 100 + 50 + 100 + 50 = 450
    startIndex = 1, stopIndex = 6;
    expect(450).toBe(calcHeightBetween(itemsScrollIndex, startIndex, stopIndex));

    // Scroll height.
    startIndex = 0, stopIndex = 999;
    expect(itemsScrollIndex[itemsScrollIndex.length - 1])
      .toBe(calcHeightBetween(itemsScrollIndex, startIndex, stopIndex));
    expect(SCROLL_HEIGHT).toBe(calcHeightBetween(itemsScrollIndex, startIndex, stopIndex));

    // Negative start.
    startIndex = -1, stopIndex = 1;
    expect(() => calcHeightBetween(itemsScrollIndex, startIndex, stopIndex)).toThrow();

    // Reverse.
    startIndex = 1, stopIndex = 2;
    expect(() => calcHeightBetween(itemsScrollIndex, stopIndex, startIndex)).toThrow();

    // Overflow stop.
    startIndex = 995, stopIndex = 1500;
    expect(() => calcHeightBetween(itemsScrollIndex, stopIndex, startIndex)).toThrow();
  });

  it('should calculate scroll overflow', () => {
    let startIndex = 0, stopIndex = 0;
    let [above, below] = calcScrollOverflow(itemsScrollIndex, startIndex, stopIndex);
    expect(above).toBe(0);
    expect(below).toBe(SCROLL_HEIGHT - itemsScrollIndex[0]);

    startIndex = 0, stopIndex = 5;
    [above, below] = calcScrollOverflow(itemsScrollIndex, startIndex, stopIndex);
    expect(above).toBe(0);
    expect(below).toBe(SCROLL_HEIGHT - calcHeightBetween(itemsScrollIndex, startIndex, stopIndex));

    startIndex = 1, stopIndex = 6;
    [above, below] = calcScrollOverflow(itemsScrollIndex, startIndex, stopIndex);
    expect(above).toBe(calcHeightBetween(itemsScrollIndex, 0, startIndex - 1));
    expect(below).toBe(SCROLL_HEIGHT - calcHeightBetween(itemsScrollIndex, 0, stopIndex));

    startIndex = 995, stopIndex = 999;
    [above, below] = calcScrollOverflow(itemsScrollIndex, startIndex, stopIndex);
    expect(above).toBe(calcHeightBetween(itemsScrollIndex, 0, startIndex - 1));
    expect(below).toBe(0);

    // Overflow stop.
    startIndex = 995, stopIndex = 1500;
    expect(() => calcScrollOverflow(itemsScrollIndex, startIndex, stopIndex)).toThrow();

    // Reverse.
    startIndex = 1, stopIndex = 2;
    expect(() => calcScrollOverflow(itemsScrollIndex, stopIndex, startIndex)).toThrow();

    // Negative start.
    startIndex = -1, stopIndex = 1;
    expect(() => calcScrollOverflow(itemsScrollIndex, stopIndex, startIndex)).toThrow();
  });

  // it('should calculate scroll thresholds', () => { });
});
