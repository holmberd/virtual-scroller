# `<virtual-scroller>`

`<virtual-scroller>` is a web component that provides a way to render large numbers elements in a scrollable list
while maintaining overall UI performance. The component achives high performance by only rendering elements
that are currently visible in its "viewport" and virtualizes elements not visible outside of it.

The `<virtual-scroller>` component is technology agnostic allowing you to use it with whichever rendering libary
that you are using for your project, e.g. React, lit, Vue...

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
  const getItemHeight = (index) => index % 2 === 0 ? 50 : 100;
  const items = Array.from(Array(10000).map((index) => ({
    id: index,
    height: getItemHeight(index),
  }));

  scrollerRef.current.addEventListener('visibleRangeChange', ({ detail: { startIndex, stopIndex } }) => {
    setItems(items.slice(startIndex, stopIndex + 1));
  });

  scrollerRef.current.init(items.length, getItemHeight);

  ...

  <virtual-scroller width='400px' height='400px' ref={scrollerRef}>
    {items.map(item => <div key={item.id} style={{ height: item.height }}>{item.id}</div>)}
  </virtual-scroller>
```


## API
- TBD

## Browser Support

`<virtual-scroller>` is supported on the last 2 major versions of all evergreen
desktop and mobile browsers and builds upon standard web platform APIs so that the performance,
capabilities and compatibility of the library get better as the web evolves.

## Development (TBD)

The following commands are available when developing `<virtual-scroller>`:

Command                         | Description
------------------------------- | -----------
`npm run build`                 | Builds all `<virtual-scroller>` distributable files.
`npm run test`                  | Run `<virtual-scroller>` unit tests.
`npm run dev`                   | TBD.