/**
 * @jest-environment jsdom
 */

import VirtualScroller from '../virtual-scroller';

const VIRTUAL_SCROLLER_HEIGHT = 400;
const VIRTUAL_SCROLLER_WIDTH = 400;
const VISIBLE_RANGE_CHANGE_EVENT = 'visibleRangeChange'

describe('virtual-scroller tests', () => {
  let events = {};
  let items = [];
  const getItemHeight = (index) => index % 2 === 0 ? 50 : 100;


  beforeAll(() => {
    items = Array(1000).fill(true).map((_, index) => ({
      id: index,
      height: getItemHeight(index),
    }));
  })

  beforeEach(() => {
    const virtualScroller = new VirtualScroller();
    document.body.appendChild(virtualScroller);

    Object.defineProperty(virtualScroller, 'clientHeight', {
      writable: false,
      value: VIRTUAL_SCROLLER_HEIGHT,
    });

    Object.defineProperty(virtualScroller, 'clientWidth', {
      writable: false,
      value: VIRTUAL_SCROLLER_WIDTH,
    });

    virtualScroller.addEventListener = jest.fn((event, callback) => {
      events[event] = callback;
    });

    virtualScroller.dispatchEvent = jest.fn((event) => {
      if (!events[event.type]) {
        throw Error(`No listener for event ${event.type}}`);
      }
      events[event.type](event);
    });

    // jest.spyOn(virtualScrollerEl, 'clientHeight', 'get').mockImplementation(() => VIRTUAL_SCROLLER_HEIGHT);
    // jest.spyOn(virtualScrollerEl, 'clientWidth', 'get').mockImplementation(() => VIRTUAL_SCROLLER_WIDTH);
    // jest.spyOn(virtualScrollerEl, 'scrollTop').mockImplementation(() => 0);
    // Object.defineProperty(virtualScrollerEl, 'clientHeight', {
    //   writable: false,
    //   value: 200,
    // });
  });

  afterEach(() => {
    events = {};
    document.querySelector('virtual-scroller').remove();
  });

  // afterAll(() => {});

  it('should be rendered in the DOM', () => {
    expect(document.querySelector('virtual-scroller')).toBeTruthy();
  });

  it('should emit visibleRangeChange event during init', (done) => {
    const virtualScroller = document.querySelector('virtual-scroller');
    virtualScroller.addEventListener(VISIBLE_RANGE_CHANGE_EVENT, () => done());
    virtualScroller.init(items.length, getItemHeight);
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

    virtualScroller.init(items.length, getItemHeight);
  });

  it('should calculate the range of visible items when scrolling down 49px', (done) => {
    const virtualScroller = document.querySelector('virtual-scroller');
    virtualScroller.scrollTop = 49;

    virtualScroller.addEventListener(VISIBLE_RANGE_CHANGE_EVENT, ({ detail: { startIndex, stopIndex } }) => {
      // 100 + 50 + 100 + 50 + 100 = 400
      expect(startIndex).toBe(0);
      expect(stopIndex).toBe(5);
      done();
    });
    virtualScroller.init(items.length, getItemHeight);
  });

  it('should calculate the range of visible items when scrolling down 50px', (done) => {
    const virtualScroller = document.querySelector('virtual-scroller');
    virtualScroller.scrollTop = 50;

    virtualScroller.addEventListener(VISIBLE_RANGE_CHANGE_EVENT, ({ detail: { startIndex, stopIndex } }) => {
      // 100 + 50 + 100 + 50 + 100 = 400
      expect(startIndex).toBe(1);
      expect(stopIndex).toBe(6);
      done();
    });
    virtualScroller.init(items.length, getItemHeight);
  });

  it('should calculate the range of visible items when scrolling down 100px', (done) => {
    const virtualScroller = document.querySelector('virtual-scroller');
    virtualScroller.scrollTop = 100;

    virtualScroller.addEventListener(VISIBLE_RANGE_CHANGE_EVENT, ({ detail: { startIndex, stopIndex } }) => {
      expect(startIndex).toBe(1);
      expect(stopIndex).toBe(7);
      done();
    });
    virtualScroller.init(items.length, getItemHeight);
  });

  it('should calculate the range of visible items when scrolling down to bottom', (done) => {
    const virtualScroller = document.querySelector('virtual-scroller');
    virtualScroller.scrollTop = 74600;

    virtualScroller.addEventListener(VISIBLE_RANGE_CHANGE_EVENT, ({ detail: { startIndex, stopIndex } }) => {
      expect(startIndex).toBe(995);
      expect(stopIndex).toBe(1000);
      done();
    });
    virtualScroller.init(items.length, getItemHeight);
  });


});
