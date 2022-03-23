import { html, render } from 'lit-html';
import { repeat } from 'lit-html/directives/repeat.js';

export { default } from './virtual-scroller';

// const testButton = document.querySelector('#test-button');
const virtualScroller = document.querySelector('virtual-scroller');

const items = Array(1000).fill(true).map((_, index) => ({
  id: index,
  height: index % 2 === 0 ? 40 : 80,
}));

const itemList = (items) => html`
  ${repeat(items, (item) => item.id, (item, index) => html`
    <div class='row' style="height:${item.height}px">${item.id}</div>
  `)}
`;

// const itemList = (items) => html`
//   ${items.map(item => html`<div class='row'>${item.id}`)}
// `;

virtualScroller.addEventListener('visibleRangeChange', ({ detail: { startIndex, stopIndex } }) => {
  // console.log('visibleRangeChange', startIndex, stopIndex);
  const visibleItemList = itemList(items.slice(startIndex, stopIndex + 1));
  render(visibleItemList, virtualScroller);
});

virtualScroller.itemCount = items.length;
virtualScroller.init((index) => {
  return index % 2 === 0 ? 40 : 80; // row heights.
});
