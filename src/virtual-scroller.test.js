/**
 * @jest-environment jsdom
 */

import VirtualScroller, { VISIBLE_RANGE_CHANGE_EVENT, Layout } from './virtual-scroller';

describe('virtual-scroller integration tests', () => {
  const VIRTUAL_SCROLLER_HEIGHT = 400;
  const VIRTUAL_SCROLLER_WIDTH = 400;

  let virtualScroller = null;
  let items = [];
  const getItemLength = (index) => index % 2 === 0 ? 50 : 100;

  const scrollTo = (element, scrollOffsetProperty, scrollOffset) => {
    Object.defineProperty(element, scrollOffsetProperty, {
      writable: false,
      value: scrollOffset,
    });
    element.dispatchEvent(new Event('scroll', { bubbles: true }));
  };

  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));


  beforeAll(() => {
    items = Array(1000).fill(true).map((_, index) => ({ id: index }));
  });

  afterAll(() => {
    items = [];
  });

  beforeEach(() => {
    virtualScroller = new VirtualScroller();

    Object.defineProperty(virtualScroller, 'clientHeight', {
      writable: false,
      value: VIRTUAL_SCROLLER_HEIGHT,
    });

    Object.defineProperty(virtualScroller, 'clientWidth', {
      writable: false,
      value: VIRTUAL_SCROLLER_WIDTH,
    });
  });

  afterEach(() => {
    virtualScroller = undefined;
    document.querySelector('virtual-scroller')?.remove();
  });

  it('should be rendered in the DOM', () => {
    document.body.appendChild(virtualScroller);
    expect(document.querySelector('virtual-scroller')).toBeTruthy();
  });

  it('should update the range of visible items during init in Vertical mode', (done) => {
    expect.assertions(2);
    const vs = document.body.appendChild(virtualScroller);
    vs.addEventListener(VISIBLE_RANGE_CHANGE_EVENT, ({ detail: { startIndex, stopIndex } }) => {
      try {
        // 50 + 100 + 50 + 100 + 50 + 100 = 450
        expect(startIndex).toBe(0); // scrollTop = 0
        expect(stopIndex).toBe(5); // bottomOffset = 50
        done();
      } catch(err) {
        done(err);
      }
    });

    vs.init(items.length, getItemLength);
  });

  it('should update the range of visible items during init in Horizontal mode', (done) => {
    expect.assertions(2);
    const vs = document.body.appendChild(virtualScroller);
    vs.addEventListener(VISIBLE_RANGE_CHANGE_EVENT, ({ detail: { startIndex, stopIndex } }) => {
      try {
        // 50 + 100 + 50 + 100 + 50 + 100 = 450
        expect(startIndex).toBe(0); // scrollLeftOffset = 0
        expect(stopIndex).toBe(5);
        done();
      } catch(err) {
        done(err);
      }
    });

    vs.init(items.length, getItemLength, {
      layout: Layout.HORIZONTAL
    });
  });

  it('should update the range of visible items after being connected', (done) => {
    virtualScroller.init(items.length, getItemLength);
    virtualScroller.addEventListener(
      VISIBLE_RANGE_CHANGE_EVENT,
      ({ detail: { startIndex, stopIndex } }) => {
        try {
          expect(startIndex).toBe(0);
          expect(stopIndex).toBe(5);
          done();
        } catch(err) {
          done(err);
        }
      }
    );

    document.body.appendChild(virtualScroller);
  });

  it('should not update on init when not connected', () => {
    const eventHandler = jest.fn();
    virtualScroller.addEventListener(VISIBLE_RANGE_CHANGE_EVENT, eventHandler);

    virtualScroller.init(items.length, getItemLength);
    expect(eventHandler).not.toHaveBeenCalled();
  });

  it('should update the range of visible items when itemCount is zero', (done) => {
    const vs = document.body.appendChild(virtualScroller);

    virtualScroller.addEventListener(
      VISIBLE_RANGE_CHANGE_EVENT,
      ({ detail: { startIndex, stopIndex } }) => {
        try {
          expect(startIndex).toBe(0);
          expect(stopIndex).toBe(0);
          done();
        } catch(err) {
          done(err);
        }
      }
    );

    vs.init(0, getItemLength);
  });

  it('should update the range of visible items when itemCount is changed to zero', (done) => {
    const vs = document.body.appendChild(virtualScroller);
    vs.init(items.length, getItemLength);

    virtualScroller.addEventListener(
      VISIBLE_RANGE_CHANGE_EVENT,
      ({ detail: { startIndex, stopIndex } }) => {
        try {
          expect(startIndex).toBe(0);
          expect(stopIndex).toBe(0);
          done();
        } catch(err) {
          done(err);
        }
      }
    );

    vs.itemCount = 0;
  });

  it('should update the range of visible items when getItemLength sum is zero', (done) => {
    const vs = document.body.appendChild(virtualScroller);
    vs.addEventListener(VISIBLE_RANGE_CHANGE_EVENT, ({ detail: { startIndex, stopIndex } }) => {
      try {
        expect(startIndex).toBe(0);
        expect(stopIndex).toBe(0);
        done();
      } catch (err) {
        done(err);
      }
    });

    vs.init(items.length, () => 0);
  });

  it('should update the range of visible items when getItemLength sum is changed to zero', (done) => {
    const vs = document.body.appendChild(virtualScroller);
    vs.init(items.length, getItemLength);

    vs.addEventListener(VISIBLE_RANGE_CHANGE_EVENT, ({ detail: { startIndex, stopIndex } }) => {
      try {
        expect(startIndex).toBe(0);
        expect(stopIndex).toBe(0);
        done();
      } catch (err) {
        done(err);
      }
    });

    vs.init(items.length, () => 0);
  });

  it('should update the range of visible items when getItemLength sum is zero', (done) => {
    const vs = document.body.appendChild(virtualScroller);
    vs.init(items.length, getItemLength);

    vs.addEventListener(VISIBLE_RANGE_CHANGE_EVENT, ({ detail: { startIndex, stopIndex } }) => {
      try {
        expect(startIndex).toBe(0);
        expect(stopIndex).toBe(0);
        done();
      } catch (err) {
        done(err);
      }
    });

    vs.init(items.length, () => 0);
  });

  it('should update the range of visible items when scroll is past threshold', (done) => {
    const vs = document.body.appendChild(virtualScroller);
    vs.init(items.length, getItemLength);

    vs.addEventListener(VISIBLE_RANGE_CHANGE_EVENT, ({ detail: { startIndex, stopIndex } }) => {
      try {
        expect(startIndex).toBe(1);
        expect(stopIndex).toBe(6);
        done();
      } catch(err) {
        done(err);
      }
    });

    scrollTo(vs, 'scrollTop', 51);
  });

  it('should not update the range of visible items when scroll is within threshold', () => {
    const vs = document.body.appendChild(virtualScroller);
    vs.init(items.length, getItemLength);

    const eventHandler = jest.fn();
    vs.addEventListener(VISIBLE_RANGE_CHANGE_EVENT, eventHandler);
    scrollTo(vs, 'scrollTop', 49);

    expect(eventHandler).not.toHaveBeenCalled();
  });

  it('should update the range of visible items when the itemCount property changed', (done) => {
    const vs = document.body.appendChild(virtualScroller);
    vs.init(items.length, getItemLength);

    vs.addEventListener(VISIBLE_RANGE_CHANGE_EVENT, ({ detail: { startIndex, stopIndex } }) => {
      try {
        expect(startIndex).toBe(0);
        expect(stopIndex).toBe(2);
        done();
      } catch(err) {
        done(err);
      }
    });

    vs.itemCount = 3;
  });

  it('should update the range of visible items when the getItemLength property changed', (done) => {
    const vs = document.body.appendChild(virtualScroller);
    vs.init(items.length, getItemLength);

    vs.addEventListener(VISIBLE_RANGE_CHANGE_EVENT, ({ detail: { startIndex, stopIndex } }) => {
      try {
        expect(startIndex).toBe(0);
        expect(stopIndex).toBe(4);
        done();
      } catch(err) {
        done(err);
      }
    });

    vs.getItemLength = () => 100;
  });

  it('should update the range of visible items when the offsetVisibleIndex property changed', (done) => {
    const vs = document.body.appendChild(virtualScroller);
    const offsetVisibleIndex = 5;
    vs.init(items.length, getItemLength);

    vs.addEventListener(
      VISIBLE_RANGE_CHANGE_EVENT,
      ({ detail: { startIndex, stopIndex, offsetIndex } }) => {
        try {
          expect(startIndex).toBe(0);
          expect(stopIndex).toBe(10);
          expect(offsetIndex).toBe(offsetVisibleIndex);
          done();
        } catch(err) {
          done(err);
        }
      }
    );

    vs.offsetVisibleIndex = offsetVisibleIndex;
  });

  it('should update the range of visible items with offsetVisibleIndex', (done) => {
    const vs = document.body.appendChild(virtualScroller);
    const offsetVisibleIndex = 5;

    vs.addEventListener(
      VISIBLE_RANGE_CHANGE_EVENT,
      ({ detail: { startIndex, stopIndex, offsetIndex } }) => {
        try {
          expect(startIndex).toBe(0);
          expect(stopIndex).toBe(10);
          expect(offsetIndex).toBe(offsetVisibleIndex);
          done();
        } catch(err) {
          done(err);
        }
      }
    );

    vs.init(items.length, getItemLength, {
      offsetVisibleIndex,
    });
  });
});
