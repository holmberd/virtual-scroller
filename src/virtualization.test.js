import {
  getVisibleItems,
  buildItemsScrollOffsetIndex,
  getScrollOverflow,
  getScrollThresholds,
  getScrollLength
} from './virtualization';

describe('Virtualization calculations unit tests', () => {
  const DOWN = 1, RIGHT = 1;
  const UP = -1, LEFT = -1;
  const CLIENT_LENGTH = 400;
  const SMALL_ITEM_LENGTH = 50;
  const LARGE_ITEM_LENGTH = 100;
  const ITEM_COUNT = 1000;
  const SCROLL_LENGTH = SMALL_ITEM_LENGTH * (ITEM_COUNT / 2) + LARGE_ITEM_LENGTH * (ITEM_COUNT / 2);
  const MAX_SCROLL_OFFSET = SCROLL_LENGTH - CLIENT_LENGTH;

  let items = [];
  let itemsScrollOffsetIndex = [];

  beforeAll(() => {
    items = Array(1000).fill(true).map((_, index) => ({ id: index }));
    const getItemLength = (index) => index % 2 === 0 ? SMALL_ITEM_LENGTH : LARGE_ITEM_LENGTH;
    itemsScrollOffsetIndex = buildItemsScrollOffsetIndex(items.length, getItemLength);
  });

  afterAll(() => {
    items = [];
    itemsScrollOffsetIndex = [];
  });

  describe('Calculate visible items indexes', () => {
    it('should calculate visible items indexes when scrollOffset = 0 and clientLength = 0', () => {
      const scrollOffset = 0;
      const clientLength = 0;
      const [startIndex, stopIndex] = getVisibleItems(itemsScrollOffsetIndex, clientLength, scrollOffset);
      expect(startIndex).toBe(0);
      expect(stopIndex).toBe(0);
    });

    it('should calculate visible items indexes when scrollOffset = 0', () => {
      const scrollOffset = 0;
      const [startIndex, stopIndex] = getVisibleItems(itemsScrollOffsetIndex, CLIENT_LENGTH, scrollOffset);
      expect(startIndex).toBe(0);
      expect(stopIndex).toBe(5);
    });

    it('should calculate visible items indexes when scrollOffset = 49', () => {
      const scrollOffset = 49;
      const [startIndex, stopIndex] = getVisibleItems(itemsScrollOffsetIndex, CLIENT_LENGTH, scrollOffset);
      expect(startIndex).toBe(0);
      expect(stopIndex).toBe(5);
    });

    it('should calculate visible items indexes when scrollOffset = 50', () => {
      const scrollOffset = 50;
      const [startIndex, stopIndex] = getVisibleItems(itemsScrollOffsetIndex, CLIENT_LENGTH, scrollOffset);
      expect(startIndex).toBe(1);
      expect(stopIndex).toBe(6);
    });

    it('should calculate visible items indexes when scrollOffset = 100', () => {
      const scrollOffset = 100;
      const [startIndex, stopIndex] = getVisibleItems(itemsScrollOffsetIndex, CLIENT_LENGTH, scrollOffset);
      expect(startIndex).toBe(1);
      expect(stopIndex).toBe(7);
    });

    it('should calculate visible items indexes when scrollOffset = 150', () => {
      const scrollOffset = 150;
      const [startIndex, stopIndex] = getVisibleItems(itemsScrollOffsetIndex, CLIENT_LENGTH, scrollOffset);
      expect(startIndex).toBe(2);
      expect(stopIndex).toBe(7);
    });

    it('should calculate visible items indexes when scrollOffset = bottom', () => {
      const scrollOffset = MAX_SCROLL_OFFSET;
      const [startIndex, stopIndex] = getVisibleItems(itemsScrollOffsetIndex, CLIENT_LENGTH, scrollOffset);
      expect(startIndex).toBe(995);
      expect(stopIndex).toBe(999);
    });
  });

  describe('Calculate length between item indexes', () => {
    it('should calculate length between item indexes: [0, 0]', () => {
      const startIndex = 0, stopIndex = 0;
      // 50
      expect(getScrollLength(itemsScrollOffsetIndex, startIndex, stopIndex)).toBe(itemsScrollOffsetIndex[0]);
    });

    it('should calculate length between item indexes: [0, 1]', () => {
      const startIndex = 0, stopIndex = 1;
      // 50 + 100
      expect(getScrollLength(itemsScrollOffsetIndex, startIndex, stopIndex)).toBe(150);
    });

    it('should calculate length between item indexes: [0, 5]', () => {
      const startIndex = 0, stopIndex = 5;
      // 50 + 100 + 50 + 100 + 50 + 100 = 450
      expect(getScrollLength(itemsScrollOffsetIndex, startIndex, stopIndex)).toBe(450);
    });

    it('should calculate length between item indexes: [1, 6]', () => {
      const startIndex = 1, stopIndex = 6;
      // 100 + 50 + 100 + 50 + 100 + 50 = 450
      expect(getScrollLength(itemsScrollOffsetIndex, startIndex, stopIndex)).toBe(450);
    });

    it('should calculate length between item indexes: [0, 999]', () => {
      // Scroll length.
      const startIndex = 0, stopIndex = 999;
      expect(getScrollLength(itemsScrollOffsetIndex, startIndex, stopIndex))
        .toBe(itemsScrollOffsetIndex[itemsScrollOffsetIndex.length - 1]);
      expect(getScrollLength(itemsScrollOffsetIndex, startIndex, stopIndex)).toBe(SCROLL_LENGTH);
    });

    it('should throw if startIndex is < 0', () => {
      const startIndex = -1, stopIndex = 1;
      expect(() => getScrollLength(itemsScrollOffsetIndex, startIndex, stopIndex)).toThrow();
    });

    it('should throw if startIndex > stopIndex', () => {
      const startIndex = 1, stopIndex = 2;
      expect(() => getScrollLength(itemsScrollOffsetIndex, stopIndex, startIndex)).toThrow();
    });

    it('should throw if stopIndex is >= itemCount', () => {
      const startIndex = 995, stopIndex = 1000;
      expect(() => getScrollLength(itemsScrollOffsetIndex, stopIndex, startIndex)).toThrow();
    });
  });

  describe('Calculate scroll overflow', () => {
    it('should calculate scroll overflow between indexes: [0, 0]', () => {
      const startIndex = 0, stopIndex = 0;
      const [above, below] = getScrollOverflow(itemsScrollOffsetIndex, startIndex, stopIndex);
      expect(above).toBe(0);
      expect(below).toBe(SCROLL_LENGTH - itemsScrollOffsetIndex[0]);
    });

    it('should calculate scroll overflow between indexes: [0, 5]', () => {
      const startIndex = 0, stopIndex = 5;
      const [above, below] = getScrollOverflow(itemsScrollOffsetIndex, startIndex, stopIndex);
      expect(above).toBe(0);
      expect(below).toBe(SCROLL_LENGTH - getScrollLength(itemsScrollOffsetIndex, startIndex, stopIndex));
    });

    it('should calculate scroll overflow between indexes: [1, 6]', () => {
      const startIndex = 1, stopIndex = 6;
      const [above, below] = getScrollOverflow(itemsScrollOffsetIndex, startIndex, stopIndex);
      expect(above).toBe(getScrollLength(itemsScrollOffsetIndex, 0, startIndex - 1));
      expect(below).toBe(SCROLL_LENGTH - getScrollLength(itemsScrollOffsetIndex, 0, stopIndex));
    });

    it('should calculate scroll overflow between indexes: [995, 999]', () => {
      const startIndex = 995, stopIndex = 999;
      const [above, below] = getScrollOverflow(itemsScrollOffsetIndex, startIndex, stopIndex);
      expect(above).toBe(getScrollLength(itemsScrollOffsetIndex, 0, startIndex - 1));
      expect(below).toBe(0);
    });

    it('should throw if stopIndex is >= itemCount', () => {
      const startIndex = 995, stopIndex = 1000;
      expect(() => getScrollOverflow(itemsScrollOffsetIndex, startIndex, stopIndex)).toThrow();
    });

    it('should throw if startIndex > stopIndex ', () => {
      const startIndex = 1, stopIndex = 2;
      expect(() => getScrollOverflow(itemsScrollOffsetIndex, stopIndex, startIndex)).toThrow();
    });

    it('should throw if startIndex > stopIndex ', () => {
      const startIndex = 1, stopIndex = 2;
      expect(() => getScrollOverflow(itemsScrollOffsetIndex, stopIndex, startIndex)).toThrow();
    });

    it('should throw if startIndex < 0 ', () => {
      const startIndex = -1, stopIndex = 1;
      expect(() => getScrollOverflow(itemsScrollOffsetIndex, stopIndex, startIndex)).toThrow();
    });
  });

  describe('Calculate vertical scroll thresholds', () => {

    it('should calculate thresholds between indexes: [0, 5], scrollOffset = 0 when scrolling DOWN', () => {
      // total: 50 + 100 + 50 + 100 + 50 + 100 = 450
      // threshold: 450 - 400(client) = 50
      const startIndex = 0, stopIndex = 5, scrollOffset = 0;
      const [top, bottom] = getScrollThresholds(
        itemsScrollOffsetIndex,
        CLIENT_LENGTH,
        startIndex,
        stopIndex,
        scrollOffset,
        DOWN
      );
      expect(top).toBe(0);
      expect(bottom).toBe(50);
    });

    it('should calculate thresholds between indexes: [0, 5], scrollOffset = 0 when scrolling UP', () => {
      const startIndex = 0, stopIndex = 5, scrollOffset = 0;
      const [top, bottom] = getScrollThresholds(
        itemsScrollOffsetIndex,
        CLIENT_LENGTH,
        startIndex,
        stopIndex,
        scrollOffset,
        UP
      );
      expect(top).toBe(0);
      expect(bottom).toBe(50);
    });

    it('should calculate thresholds between indexes: [0, 5] and scrollOffset = 25 when scrolling DOWN', () => {
      const startIndex = 0, stopIndex = 5, scrollOffset = 25;
      const [top, bottom] = getScrollThresholds(
        itemsScrollOffsetIndex,
        CLIENT_LENGTH,
        startIndex,
        stopIndex,
        scrollOffset,
        DOWN
      );
      expect(top).toBe(25);
      expect(bottom).toBe(25);
    });

    it('should calculate thresholds between indexes: [0, 5] and scrollOffset = 25 when scrolling UP', () => {
      const startIndex = 0, stopIndex = 5, scrollOffset = 25;
      const [top, bottom] = getScrollThresholds(
        itemsScrollOffsetIndex,
        CLIENT_LENGTH,
        startIndex,
        stopIndex,
        scrollOffset,
        UP,
      );
      expect(top).toBe(25);
      expect(bottom).toBe(75);
    });

    it('should calculate thresholds between indexes: [0, 5], scrollOffset = 50 when scrolling DOWN', () => {
      // total: 50 + 100 + 50 + 100 + 50 + 100 = 450
      // threshold: 450 - 400(client) - 50 = 0
      const startIndex = 0, stopIndex = 5, scrollOffset = 50;
      const [top, bottom] = getScrollThresholds(
        itemsScrollOffsetIndex,
        CLIENT_LENGTH,
        startIndex,
        stopIndex,
        scrollOffset,
        DOWN
      );
      expect(top).toBe(0);
      expect(bottom).toBe(0);
    });

    it('should calculate thresholds between indexes: [0, 5], scrollOffset = 50 when scrolling UP', () => {
      // total: 50 + 100 + 50 + 100 + 50 + 100 = 450
      // threshold: 450 - 400(client) - 50 = 0
      const startIndex = 0, stopIndex = 5, scrollOffset = 50;
      const [top, bottom] = getScrollThresholds(
        itemsScrollOffsetIndex,
        CLIENT_LENGTH,
        startIndex,
        stopIndex,
        scrollOffset,
        UP
      );
      expect(top).toBe(50);
      expect(bottom).toBe(100);
    });

    it('should calculate thresholds between indexes: [1, 6], scrollOffset = 51 when scrolling DOWN', () => {
      const startIndex = 1, stopIndex = 6, scrollOffset = 51;
      const [top, bottom] = getScrollThresholds(
        itemsScrollOffsetIndex,
        CLIENT_LENGTH,
        startIndex,
        stopIndex,
        scrollOffset,
        DOWN
      );
      expect(top).toBe(99);
      expect(bottom).toBe(49);
    });

    it('should calculate thresholds between indexes: [1, 6], scrollOffset = 51 when scrolling UP', () => {
      const startIndex = 1, stopIndex = 6, scrollOffset = 51;
      const [top, bottom] = getScrollThresholds(
        itemsScrollOffsetIndex,
        CLIENT_LENGTH,
        startIndex,
        stopIndex,
        scrollOffset,
        UP
      );
      expect(top).toBe(1);
      expect(bottom).toBe(1);
    });

    it('should calculate thresholds between indexes: [1, 7] and scrollOffset = 125 when scrolling DOWN', () => {
      const startIndex = 1, stopIndex = 7, scrollOffset = 125;
      const [top, bottom] = getScrollThresholds(
        itemsScrollOffsetIndex,
        CLIENT_LENGTH,
        startIndex,
        stopIndex,
        scrollOffset,
        DOWN
      );
      expect(top).toBe(25);
      expect(bottom).toBe(75);
    });

    it('should calculate thresholds between indexes: [1, 7] and scrollOffset = 125 when scrolling UP', () => {
      const startIndex = 1, stopIndex = 7, scrollOffset = 125;
      const [top, bottom] = getScrollThresholds(
        itemsScrollOffsetIndex,
        CLIENT_LENGTH,
        startIndex,
        stopIndex,
        scrollOffset,
        UP
      );
      expect(top).toBe(75);
      expect(bottom).toBe(25);
    });

    it('should calculate thresholds between indexes: [0, 5] and scrollOffset = 250 when scrolling DOWN', () => {
      const startIndex = 0, stopIndex = 5, scrollOffset = 250;
      const [top, bottom] = getScrollThresholds(
        itemsScrollOffsetIndex,
        CLIENT_LENGTH,
        startIndex,
        stopIndex,
        scrollOffset,
        DOWN
      );
      expect(top).toBe(-200);
      expect(bottom).toBe(-200);
    });

    it('should calculate thresholds between indexes: [995, 999] and scrollOffset = bottom when scrolling DOWN', () => {
      const startIndex = 995, stopIndex = 999, scrollOffset = MAX_SCROLL_OFFSET;
      const [top, bottom] = getScrollThresholds(
        itemsScrollOffsetIndex,
        CLIENT_LENGTH,
        startIndex,
        stopIndex,
        scrollOffset,
        DOWN
      );
      expect(top).toBe(100);
      expect(bottom).toBe(0);
    });

    it('should calculate thresholds between indexes: [995, 999] and scrollOffset = bottom when scrolling UP', () => {
      const startIndex = 995, stopIndex = 999, scrollOffset = MAX_SCROLL_OFFSET;
      const [top, bottom] = getScrollThresholds(
        itemsScrollOffsetIndex,
        CLIENT_LENGTH,
        startIndex,
        stopIndex,
        scrollOffset,
        UP
      );
      expect(top).toBe(0);
      expect(bottom).toBe(100);
    });

    it('should calculate thresholds between indexes: [995, 999] and scrollOffset = 74000 when scrolling UP', () => {
      const startIndex = 995, stopIndex = 999, scrollOffset = MAX_SCROLL_OFFSET - 600;
      const [top, bottom] = getScrollThresholds(
        itemsScrollOffsetIndex,
        CLIENT_LENGTH,
        startIndex,
        stopIndex,
        scrollOffset,
        UP
      );
      expect(top).toBe(-600);
      expect(bottom).toBe(-500);
    });
  });

  describe('Calculate horizontal scroll thresholds', () => {

    it('should calculate thresholds between indexes: [0, 5], scrollOffset = 0 when scrolling RIGHT', () => {
      // total: 50 + 100 + 50 + 100 + 50 + 100 = 450
      // threshold: 450 - 400(client) = 50
      const startIndex = 0, stopIndex = 5, scrollOffset = 0;
      const [top, bottom] = getScrollThresholds(
        itemsScrollOffsetIndex,
        CLIENT_LENGTH,
        startIndex,
        stopIndex,
        scrollOffset,
        RIGHT
      );
      expect(top).toBe(0);
      expect(bottom).toBe(50);
    });

    it('should calculate thresholds between indexes: [0, 5], scrollOffset = 0 when scrolling LEFT', () => {
      const startIndex = 0, stopIndex = 5, scrollOffset = 0;
      const [top, bottom] = getScrollThresholds(
        itemsScrollOffsetIndex,
        CLIENT_LENGTH,
        startIndex,
        stopIndex,
        scrollOffset,
        LEFT
      );
      expect(top).toBe(0);
      expect(bottom).toBe(50);
    });

    it('should calculate thresholds between indexes: [0, 5] and scrollOffset = 25 when scrolling RIGHT', () => {
      const startIndex = 0, stopIndex = 5, scrollOffset = 25;
      const [top, bottom] = getScrollThresholds(
        itemsScrollOffsetIndex,
        CLIENT_LENGTH,
        startIndex,
        stopIndex,
        scrollOffset,
        RIGHT
      );
      expect(top).toBe(25);
      expect(bottom).toBe(25);
    });

    it('should calculate thresholds between indexes: [0, 5] and scrollOffset = 25 when scrolling LEFT', () => {
      const startIndex = 0, stopIndex = 5, scrollOffset = 25;
      const [top, bottom] = getScrollThresholds(
        itemsScrollOffsetIndex,
        CLIENT_LENGTH,
        startIndex,
        stopIndex,
        scrollOffset,
        LEFT
      );
      expect(top).toBe(25);
      expect(bottom).toBe(75);
    });

    it('should calculate thresholds between indexes: [1, 7] and scrollOffset = 125 when scrolling RIGHT', () => {
      const startIndex = 1, stopIndex = 7, scrollOffset = 125;
      const [top, bottom] = getScrollThresholds(
        itemsScrollOffsetIndex,
        CLIENT_LENGTH,
        startIndex,
        stopIndex,
        scrollOffset,
        RIGHT
      );
      expect(top).toBe(25);
      expect(bottom).toBe(75);
    });

    it('should calculate thresholds between indexes: [1, 7] and scrollOffset = 125 when scrolling LEFT', () => {
      const startIndex = 1, stopIndex = 7, scrollOffset = 125;
      const [top, bottom] = getScrollThresholds(
        itemsScrollOffsetIndex,
        CLIENT_LENGTH,
        startIndex,
        stopIndex,
        scrollOffset,
        LEFT
      );
      expect(top).toBe(75);
      expect(bottom).toBe(25);
    });

    it('should calculate thresholds between indexes: [0, 5] and scrollOffset = 250 when scrolling RIGHT', () => {
      const startIndex = 0, stopIndex = 5, scrollOffset = 250;
      const [top, bottom] = getScrollThresholds(
        itemsScrollOffsetIndex,
        CLIENT_LENGTH,
        startIndex,
        stopIndex,
        scrollOffset,
        RIGHT
      );
      expect(top).toBe(-200);
      expect(bottom).toBe(-200);
    });

    it('should calculate thresholds between indexes: [995, 999] and scrollOffset = bottom when scrolling RIGHT', () => {
      const startIndex = 995, stopIndex = 999, scrollOffset = MAX_SCROLL_OFFSET;
      const [top, bottom] = getScrollThresholds(
        itemsScrollOffsetIndex,
        CLIENT_LENGTH,
        startIndex,
        stopIndex,
        scrollOffset,
        RIGHT
      );
      expect(top).toBe(100);
      expect(bottom).toBe(0);
    });

    it('should calculate thresholds between indexes: [995, 999] and scrollOffset = bottom when scrolling LEFT', () => {
      const startIndex = 995, stopIndex = 999, scrollOffset = MAX_SCROLL_OFFSET;
      const [top, bottom] = getScrollThresholds(
        itemsScrollOffsetIndex,
        CLIENT_LENGTH,
        startIndex,
        stopIndex,
        scrollOffset,
        LEFT
      );
      expect(top).toBe(0);
      expect(bottom).toBe(100);
    });

    it('should calculate thresholds between indexes: [995, 999] and scrollOffset = 74000 when scrolling LEFT', () => {
      const startIndex = 995, stopIndex = 999, scrollOffset = MAX_SCROLL_OFFSET - 600;
      const [top, bottom] = getScrollThresholds(
        itemsScrollOffsetIndex,
        CLIENT_LENGTH,
        startIndex,
        stopIndex,
        scrollOffset,
        LEFT
      );
      expect(top).toBe(-600);
      expect(bottom).toBe(-500);
    });
  });
});
