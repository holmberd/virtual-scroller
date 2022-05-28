import VirtualScroller, { VISIBLE_RANGE_CHANGE_EVENT } from 'virtual-scroller';
import { html, render } from 'lit-html';
import { repeat } from 'lit-html/directives/repeat.js';

const virtualScroller = new VirtualScroller();
const root = document.querySelector('.root');
root.appendChild(virtualScroller);
virtualScroller.style.width = '400px';
virtualScroller.style.height = '400px';

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

virtualScroller.addEventListener(VISIBLE_RANGE_CHANGE_EVENT, ({ detail }) => {
  const { startIndex, stopIndex } = detail;
  const visibleItemList = itemList(items.slice(startIndex, stopIndex + 1));
  render(visibleItemList, virtualScroller);
});

virtualScroller.init(items.length, getItemHeight);