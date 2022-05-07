/**
 * @jest-environment jsdom
 */

import VirtualScroller, { VISIBLE_RANGE_CHANGE_EVENT } from './virtual-scroller';

describe('virtual-scroller tests', () => {
  const VIRTUAL_SCROLLER_HEIGHT = 400;
  const VIRTUAL_SCROLLER_WIDTH = 400;

  let events = {};
  let items = [];
  const getItemSize = (index) => index % 2 === 0 ? 50 : 100;

  beforeAll(() => {
    items = Array(1000).fill(true).map((_, index) => ({ id: index }));
  })

  afterAll(() => {
    items = [];
  });

  beforeEach(() => {
    const virtualScroller = new VirtualScroller();

    Object.defineProperty(virtualScroller, 'clientHeight', {
      writable: false,
      value: VIRTUAL_SCROLLER_HEIGHT,
    });

    Object.defineProperty(virtualScroller, 'clientWidth', {
      writable: false,
      value: VIRTUAL_SCROLLER_WIDTH,
    });

    document.body.appendChild(virtualScroller);

    virtualScroller.addEventListener = jest.fn((event, callback) => {
      events[event] = callback;
    });

    virtualScroller.dispatchEvent = jest.fn((event) => {
      events[event.type] && events[event.type](event);
    });
  });

  afterEach(() => {
    events = {};
    document.querySelector('virtual-scroller').remove();
  });

  it('should be rendered in the DOM', () => {
    expect(document.querySelector('virtual-scroller')).toBeTruthy();
  });

  it('should calculate the range of visible items during init (scrollTop = 0)', (done) => {
    expect.assertions(2);
    const virtualScroller = document.querySelector('virtual-scroller');
    virtualScroller.addEventListener(VISIBLE_RANGE_CHANGE_EVENT, ({ detail: { startIndex, stopIndex } }) => {
      // 50 + 100 + 50 + 100 + 50 + 100 = 450
      expect(startIndex).toBe(0); // scrollTop = 0
      expect(stopIndex).toBe(5); // bottomOffset = 50
      done();
    });

    virtualScroller.init(items.length, getItemSize);
  });

  it('should re-calculate the range of visible items when the itemCount property changed ', (done) => {
    const virtualScroller = document.querySelector('virtual-scroller');
    virtualScroller.init(items.length, getItemSize);

    virtualScroller.addEventListener(VISIBLE_RANGE_CHANGE_EVENT, ({ detail: { startIndex, stopIndex } }) => {
      expect(startIndex).toBe(0);
      expect(stopIndex).toBe(2);
      done();
    });

    virtualScroller.itemCount = 3;
  });

  it('should re-calculate the range of visible items when the getItemSize property changed ', (done) => {
    const virtualScroller = document.querySelector('virtual-scroller');
    virtualScroller.init(items.length, getItemSize);

    virtualScroller.addEventListener(VISIBLE_RANGE_CHANGE_EVENT, ({ detail: { startIndex, stopIndex } }) => {
      expect(startIndex).toBe(0);
      expect(stopIndex).toBe(4);
      done();
    });

    virtualScroller.getItemSize = (index) => 100;
  });

  it('should re-calculate the range of visible items when the offsetVisibleIndex property changed ', (done) => {
    const offsetVisibleIndex = 5;
    const virtualScroller = document.querySelector('virtual-scroller');
    virtualScroller.init(items.length, getItemSize);

    virtualScroller.addEventListener(
      VISIBLE_RANGE_CHANGE_EVENT,
      ({ detail: { startIndex, stopIndex, offsetIndex } }) => {
        expect(startIndex).toBe(0);
        expect(stopIndex).toBe(10);
        expect(offsetIndex).toBe(offsetVisibleIndex);
        done();
      }
    );

    virtualScroller.offsetVisibleIndex = offsetVisibleIndex;
  });
});
