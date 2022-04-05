import { html, render } from 'lit-html';
import { repeat } from 'lit-html/directives/repeat.js';

import React from 'react';
import ReactDOM from 'react-dom';

import VirtualScroller from './virtual-scroller';

// import VirtualScroller from './virtual-scroller';

// const testButton = document.querySelector('#test-button');

const virtualScroller = new VirtualScroller();
virtualScroller.throttle = 100;

const root = document.querySelector('.root');
root.appendChild(virtualScroller);
// const virtualScroller = document.querySelector('virtual-scroller');

const getItemHeight = (index) => index % 2 === 0 ? 50 : 100;

const items = Array(1000).fill(true).map((_, index) => ({
  id: index,
  height: getItemHeight(index),
}));


virtualScroller.addEventListener('visibleRangeChange', ({ detail: { startIndex, stopIndex } }) => {
  console.log('visibleRangeChange', startIndex, stopIndex);
  renderLit(startIndex, stopIndex);
});

virtualScroller.init(items.length, getItemHeight);

function renderLit(startIndex, stopIndex) {
  // const itemList = (items) => html`
  //   ${items.map(item => html`<div class='row' style="height:${item.height}px">${item.id}`)}
  // `;

  const itemList = (items) => html`
  ${repeat(items, (item) => item.id, (item, index) => html`
      <div class='row' style="height:${item.height}px">${item.id}</div>
    `)}
  `;

  const visibleItemList = itemList(items.slice(startIndex, stopIndex + 1));
  render(visibleItemList, virtualScroller);
}

// function List({ items }) {
//   return (
//     <virtual-scroller>

//     </virtual-scroller>
//   )
// }

// function renderReact() {
//   ReactDOM.render(
//     <List/>,
//     document.querySelector('.root')
//   );
// }
