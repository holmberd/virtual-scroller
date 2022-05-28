# `<virtual-scroller>`

`<virtual-scroller>` is a web component that provides a way to render a large number of elements in a scrollable list without negatively affecting overall UI performance. The component achives high performance by only rendering elements that are currently visible in its "viewport" and virtualizes elements not visible outside of it.

The `<virtual-scroller>` component is technology agnostic allowing you to use it with whichever rendering libary
that you are already using in an existing project, e.g. React, lit, Vue...

## Performance
`<virtual-scroller>` has **great** performance since it takes full advantage of the browser's ability to batch DOM updates which minimizes reflow and repaint. It also has a very small footprint allowing you to keep your bundles small for faster page loads.

## Install

The `<virtual-scroller>` web component can be installed from [NPM](https://npmjs.org):

```sh
# NPM
npm install @holmberd/virtual-scroller

# Yarn
yarn add @holmberd/virtual-scroller

```

## Example Usage

### React
```jsx
  import VirtualScroller, { Virtualization, VISIBLE_RANGE_CHANGE_EVENT } from 'virtual-scroller';

  const getItemHeight = (index) => index % 2 === 0 ? 50 : 100;
  const listItems = Array.from(Array(10000).map((index) => ({
    id: index,
    height: getItemHeight(index),
  }));

  function List() {
    const [items, setItems] = useState([]);

    useEffect(() => {
      if (!scrollerRef?.current) {
        return;
      }

      scrollerRef.current.addEventListener(VISIBLE_RANGE_CHANGE_EVENT, ({ detail }) => {
        const { startIndex, stopIndex, offsetIndex } = detail;
        setItems(listItems.slice(startIndex, stopIndex + 1));
      });

      scrollerRef.current.init(listItems.length, getItemHeight, {
        offsetVisibleIndex: 0,
        virtualization: Virtualization.VERTICAL,
      });
    }, [])

  return (
    <virtual-scroller style={{ width: 400, height: 400 }} ref={scrollerRef}>
      {items.map(item => <div key={item.id} style={{ height: item.height }}>{item.id}</div>)}
    </virtual-scroller>
  );
}
```

## Methods

#### `init(itemCount: string, getItemLength: function, options: object): void`
Once called the virtual-scroller will calculate the visible range and dispatch a `visible-range-change` event. You can call this multiple times to reset the items scroll index, e.g. to increase item-count when a user scrolls down the list or when the height of an item changes.

**Arguments:**
- `itemCount: number`: The total number of top-level items.
- `getItemLength(index: number): number`: Function to calculate and return the length(height or width) of each item by index.

**Options:**
- `offsetVisibleIndex = 0`: Number of extra items to be rendered before/after the visible range.
- `virtualization = 'vertical': Determines whether to use `vertical` or `horizontal` virtualization.
- `enableResizeObserver = false`: Set wether to update visible item indexes on element resize.
- `disableVirtualization = false`: Set to disable virtualization, (`visible-range-change` will still be dispatched).

## Properties

#### `itemCount = 0`
Set the total number of top-level items.

#### `getItemLength = (index) => 0`
Set function to calculate and return the length(height or width) of each item by index.

#### `offsetVisibleIndex = 0`
Set the number of extra items to be rendered before/after the visible range.

#### `enableResizeObserver = false`
Set wether to update visible item indexes on element resize.

#### `virtualization = 'vertical'`
Get/Set current virtualization mode.

## Events

#### `visible-range-change: CustomEvent`
Fired when the visible range of item indexes changes.
```js
event.detail.startIndex: number
event.detail.stopIndex: number
event.detail.offsetIndex: number
```

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
If you'd like to contribute to `<virtual-scroller>`, please reach out.