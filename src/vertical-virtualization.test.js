import {
  calcVisibleItems,
  buildItemsScrollIndex,
  calcScrollOverflow,
  calcHeightBetween,
  ScrollDir,
  calcScrollThresholds,
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

  describe('Calculate visible items indexes', () => {
    it('should calculate visible items indexes when scrollTop = 0 (top)', () => {
      const scrollTop = 0;
      const [startIndex, stopIndex] = calcVisibleItems(itemsScrollIndex, CLIENT_HEIGHT, scrollTop);
      expect(startIndex).toBe(0);
      expect(stopIndex).toBe(5);
    });

    it('should calculate visible items indexes when scrollTop = 49', () => {
      const scrollTop = 49;
      const [startIndex, stopIndex] = calcVisibleItems(itemsScrollIndex, CLIENT_HEIGHT, scrollTop);
      expect(startIndex).toBe(0);
      expect(stopIndex).toBe(5);
    });

    it('should calculate visible items indexes when scrollTop = 50', () => {
      const scrollTop = 50;
      const [startIndex, stopIndex] = calcVisibleItems(itemsScrollIndex, CLIENT_HEIGHT, scrollTop);
      expect(startIndex).toBe(1);
      expect(stopIndex).toBe(6);
    });

    it('should calculate visible items indexes when scrollTop = 100', () => {
      const scrollTop = 100;
      const [startIndex, stopIndex] = calcVisibleItems(itemsScrollIndex, CLIENT_HEIGHT, scrollTop);
      expect(startIndex).toBe(1);
      expect(stopIndex).toBe(7);
    });

    it('should calculate visible items indexes when scrollTop = 150', () => {
      const scrollTop = 150;
      const [startIndex, stopIndex] = calcVisibleItems(itemsScrollIndex, CLIENT_HEIGHT, scrollTop);
      expect(startIndex).toBe(2);
      expect(stopIndex).toBe(7);
    });

    it('should calculate visible items indexes when scrollTop = bottom', () => {
      const scrollTop = SCROLL_TOP_MAX;
      const [startIndex, stopIndex] = calcVisibleItems(itemsScrollIndex, CLIENT_HEIGHT, scrollTop);
      expect(startIndex).toBe(995);
      expect(stopIndex).toBe(999);
    });
  });

  describe('Calculate height between item indexes', () => {
    it('should calculate height between item indexes: [0, 0]', () => {
      // 50
      const startIndex = 0, stopIndex = 0;
      expect(calcHeightBetween(itemsScrollIndex, startIndex, stopIndex)).toBe(itemsScrollIndex[0]);
    });

    it('should calculate height between item indexes: [0, 1]', () => {
      // 50 + 100
      const startIndex = 0, stopIndex = 1;
      expect(calcHeightBetween(itemsScrollIndex, startIndex, stopIndex)).toBe(150);
    });

    it('should calculate height between item indexes: [0, 5]', () => {
      // 50 + 100 + 50 + 100 + 50 + 100 = 450
      const startIndex = 0, stopIndex = 5;
      expect(calcHeightBetween(itemsScrollIndex, startIndex, stopIndex)).toBe(450);
    });

    it('should calculate height between item indexes: [1, 6]', () => {
      // 100 + 50 + 100 + 50 + 100 + 50 = 450
      const startIndex = 1, stopIndex = 6;
      expect(calcHeightBetween(itemsScrollIndex, startIndex, stopIndex)).toBe(450);
    });

    it('should calculate height between item indexes: [0, 999]', () => {
      // Scroll height.
      const startIndex = 0, stopIndex = 999;
      expect(calcHeightBetween(itemsScrollIndex, startIndex, stopIndex))
        .toBe(itemsScrollIndex[itemsScrollIndex.length - 1]);
      expect(calcHeightBetween(itemsScrollIndex, startIndex, stopIndex)).toBe(SCROLL_HEIGHT);
    });

    it('should throw if startIndex is < 0', () => {
      const startIndex = -1, stopIndex = 1;
      expect(() => calcHeightBetween(itemsScrollIndex, startIndex, stopIndex)).toThrow();
    });

    it('should throw if startIndex > stopIndex', () => {
      const startIndex = 1, stopIndex = 2;
      expect(() => calcHeightBetween(itemsScrollIndex, stopIndex, startIndex)).toThrow();
    });

    it('should throw if stopIndex is >= itemCount', () => {
      const startIndex = 995, stopIndex = 1000;
      expect(() => calcHeightBetween(itemsScrollIndex, stopIndex, startIndex)).toThrow();
    });
  });

  // TODO: consider overscan/offset indexes.
  describe('Calculate scroll overflow', () => {
    it('should calculate scroll overflow between indexes: [0, 0]', () => {
      const startIndex = 0, stopIndex = 0;
      const [above, below] = calcScrollOverflow(itemsScrollIndex, startIndex, stopIndex);
      expect(above).toBe(0);
      expect(below).toBe(SCROLL_HEIGHT - itemsScrollIndex[0]);
    });

    it('should calculate scroll overflow between indexes: [0, 5]', () => {
      const startIndex = 0, stopIndex = 5;
      const [above, below] = calcScrollOverflow(itemsScrollIndex, startIndex, stopIndex);
      expect(above).toBe(0);
      expect(below).toBe(SCROLL_HEIGHT - calcHeightBetween(itemsScrollIndex, startIndex, stopIndex));
    });

    it('should calculate scroll overflow between indexes: [1, 6]', () => {
      const startIndex = 1, stopIndex = 6;
      const [above, below] = calcScrollOverflow(itemsScrollIndex, startIndex, stopIndex);
      expect(above).toBe(calcHeightBetween(itemsScrollIndex, 0, startIndex - 1));
      expect(below).toBe(SCROLL_HEIGHT - calcHeightBetween(itemsScrollIndex, 0, stopIndex));
    });

    it('should calculate scroll overflow between indexes: [995, 999]', () => {
      const startIndex = 995, stopIndex = 999;
      const [above, below] = calcScrollOverflow(itemsScrollIndex, startIndex, stopIndex);
      expect(above).toBe(calcHeightBetween(itemsScrollIndex, 0, startIndex - 1));
      expect(below).toBe(0);
    });

    it('should throw if stopIndex is >= itemCount', () => {
      const startIndex = 995, stopIndex = 1000;
      expect(() => calcScrollOverflow(itemsScrollIndex, startIndex, stopIndex)).toThrow();
    });

    it('should throw if startIndex > stopIndex ', () => {
      const startIndex = 1, stopIndex = 2;
      expect(() => calcScrollOverflow(itemsScrollIndex, stopIndex, startIndex)).toThrow();
    });

    it('should throw if startIndex > stopIndex ', () => {
      const startIndex = 1, stopIndex = 2;
      expect(() => calcScrollOverflow(itemsScrollIndex, stopIndex, startIndex)).toThrow();
    });

    it('should throw if startIndex < 0 ', () => {
      const startIndex = -1, stopIndex = 1;
      expect(() => calcScrollOverflow(itemsScrollIndex, stopIndex, startIndex)).toThrow();
    });
  });

  describe('Calculate scroll thresholds', () => {

    it('should calculate thresholds between indexes: [0, 5], scrollTop = 0 when scrolling down', () => {
      // total: 50 + 100 + 50 + 100 + 50 + 100 = 450
      // threshold: 450 - 400(client) = 50
      let startIndex = 0, stopIndex = 5, scrollTop = 0;
      let [top, bottom] = calcScrollThresholds(
        itemsScrollIndex,
        CLIENT_HEIGHT,
        startIndex,
        stopIndex,
        ScrollDir.DOWN,
        scrollTop
      );
      expect(top).toBe(0);
      expect(bottom).toBe(50);
    });

    it('should calculate scroll thresholds between indexes: [0, 5] and scrollTop = 25 when scrolling down', () => {
      startIndex = 0, stopIndex = 5, scrollTop = 25;
      [top, bottom] = calcScrollThresholds(
        itemsScrollIndex,
        CLIENT_HEIGHT,
        startIndex,
        stopIndex,
        ScrollDir.DOWN,
        scrollTop
      );
      expect(top).toBe(25);
      expect(bottom).toBe(25);
    });

    it('should calculate scroll thresholds between indexes: [0, 5] and scrollTop = 25 when scrolling down', () => {
      startIndex = 0, stopIndex = 5, scrollTop = 25;
      [top, bottom] = calcScrollThresholds(
        itemsScrollIndex,
        CLIENT_HEIGHT,
        startIndex,
        stopIndex,
        ScrollDir.DOWN,
        scrollTop
      );
      expect(top).toBe(25);
      expect(bottom).toBe(25);
    });

    it('should calculate scroll thresholds between indexes: [1, 7] and scrollTop = 125 when scrolling down', () => {
      startIndex = 1, stopIndex = 7, scrollTop = 125;
      [top, bottom] = calcScrollThresholds(
        itemsScrollIndex,
        CLIENT_HEIGHT,
        startIndex,
        stopIndex,
        ScrollDir.DOWN,
        scrollTop
      );
      expect(top).toBe(25);
      expect(bottom).toBe(75);
    });

    it('should calculate scroll thresholds between indexes: [1, 7] and scrollTop = 125 when scrolling up', () => {
      startIndex = 1, stopIndex = 7, scrollTop = 125;
      [top, bottom] = calcScrollThresholds(
        itemsScrollIndex,
        CLIENT_HEIGHT,
        startIndex,
        stopIndex,
        ScrollDir.UP,
        scrollTop
      );
      expect(top).toBe(75);
      expect(bottom).toBe(25);
    });
  });
});
