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

  it('should calculate', () => {
    const scrollTop = 0;
    const [startIndex, stopIndex ] = calcVisibleItems(itemsScrollIndex, CLIENT_HEIGHT, scrollTop);
    expect(startIndex).toBe(0);
    expect(stopIndex).toBe(5);
  });

});
