# `<virtual-scroller>`

`<virtual-scroller>` is a web component that provides a way to render large numbers elements in a scrollable list
while maintaining overall UI performance. The component achives high performance by only rendering elements
that are currently visible in its "viewport" and virtualizes elements not visible outside of it.

The `<virtual-scroller>` component is technology agnostic allowing you to use it with whichever rendering libary
that you are using for your project, e.g. React, lit, Vue...

## Performance
`<virtual-scroller>` has great performance as it takes full advantage of browser's capabilities to batch DOM changes to minimize reflow and repaint. It also has a very small footprint to keep your bundles small to optimize for faster page loads.

## Install

The `<virtual-scroller>` web component can be installed from [NPM](https://npmjs.org):

```sh
# NPM
npm install virtual-scroller

# Yarn
yarn add virtual-scroller

```

## Usage

### React
```js
  import VirtualScroller from 'virtual-scroller';

  const getItemHeight = (index) => index % 2 === 0 ? 50 : 100;
  const items = Array.from(Array(10000).map((index) => ({
    id: index,
    height: getItemHeight(index),
  }));

  useEffect(() => {
    if (!scrollerRef?.current) {
      return;
    }

    scrollerRef.current.addEventListener('visibleRangeChange', ({ detail }) => {
      const { startIndex, stopIndex } = detail;
      setItems(items.slice(startIndex, stopIndex + 1));
    });

    scrollerRef.current.init(items.length, getItemHeight);
  }, [])

  ...

  <virtual-scroller width='400px' height='400px' ref={scrollerRef}>
    {items.map(item => <div key={item.id} style={{ height: item.height }}>{item.id}</div>)}
  </virtual-scroller>
```

### Lit
```js
import VirtualScroller from 'virtual-scroller';
import { html, render } from 'lit-html';
import { repeat } from 'lit-html/directives/repeat.js';

const virtualScroller = new VirtualScroller();
const root = document.querySelector('.root');
root.appendChild(virtualScroller);

const getItemHeight = (index) => index % 2 === 0 ? 50 : 100;

const items = Array.from(Array(1000).keys()).map((index) => ({
  id: index,
  height: getItemHeight(index),
}));

const itemList = (items) => html`
  ${repeat(items, (item) => item.id, (item, index) => html`
    <div style="height:${item.height}px">${item.id}</div>
  `)}
`;

virtualScroller.addEventListener('visibleRangeChange', ({ detail }) => {
  const { startIndex, stopIndex } = detail;
  const visibleItemList = itemList(items.slice(startIndex, stopIndex + 1));
  render(visibleItemList, virtualScroller);
});

virtualScroller.init(items.length, getItemHeight);
```

## API
### init(itemCount: string, getItemHeight: function, itemBuffer = 0): void
Takes in three arguments:
- `itemCount`: The total number of top-level items.
- `getItemHeight`: Function to calculate item height by its index.
- `itemBuffer`: Number of extra items to be rendered before/after the visible range.

Once called the virtual-scroller will calculate the visible range and dispatch a `visibleRangeChange` event. You can call this multiple times to reset the items scroll index, e.g. to increase item-count when a user scrolls down the list or when the height of an item changes.

### getItemHeight(index: number): number
Should calculate and return the height(px) for the item index.
```js
const getItemHeight = (index) => index % 2 === 0 ? 50 : 100;
```

### update(): void
Calculates the visible items range and dispatches a `visibleRangeChange`. Only call this if you need to manually trigger the event without calling `init` or scroll.

## Browser Support

`<virtual-scroller>` supports `es2020` JavaScript features for desktop and
mobile browsers and builds upon standard web platform APIs so that the performance,
capabilities and compatibility of the library get better as the web evolves.

## Development (TBD)

The following commands are available when developing `<virtual-scroller>`:

Command                         | Description
------------------------------- | -----------
`npm run build`                 | Builds all `<virtual-scroller>` distributable files.
`npm run test`                  | Run `<virtual-scroller>` unit tests.
`npm run dev`                   | TBD.

## Contributing
If you'd like to contribute to `<virtual-scroller``, please first read through our contribution guidelines.