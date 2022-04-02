import { calcVisibleItems, buildItemsScrollIndex } from './vertical-virtualization';

const CLIENT_HEIGHT = 400;

describe('Vertical virtualization calculation tests', () => {
  let items = [];
  let itemsScrollIndex = [];
  const getItemHeight = (index) => index % 2 === 0 ? 50 : 100;

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
    scrollTop = 74600;
    [startIndex, stopIndex] = calcVisibleItems(itemsScrollIndex, CLIENT_HEIGHT, scrollTop);
    expect(startIndex).toBe(995);
    expect(stopIndex).toBe(1000);
  });
});
