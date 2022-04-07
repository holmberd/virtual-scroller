import { html, render } from 'lit-html';
import { repeat } from 'lit-html/directives/repeat.js';

import React from 'react';
import ReactDOM from 'react-dom';

import VirtualScroller from './virtual-scroller';
import List from './List';


renderReact();

function renderReact() {
  ReactDOM.render(
    <List />,
    document.querySelector('.root')
  );
}

function renderLit() {
  const virtualScroller = new VirtualScroller();

  const root = document.querySelector('.root');
  root.appendChild(virtualScroller);

  const getItemHeight = (index) => index % 2 === 0 ? 50 : 100;

  const items = Array(1000).fill(true).map((_, index) => ({
    id: index,
    height: getItemHeight(index),
  }));

  // const itemList = (items) => html`
  //   ${items.map(item => html`<div class='row' style="height:${item.height}px">${item.id}`)}
  // `;

  const itemList = (items) => html`
  ${repeat(items, (item) => item.id, (item, index) => html`
      <div class='row' style="height:${item.height}px">${item.id}</div>
    `)}
  `;

  virtualScroller.addEventListener('visibleRangeChange', ({ detail: { startIndex, stopIndex } }) => {
    console.log('visibleRangeChange', startIndex, stopIndex);
    const visibleItemList = itemList(items.slice(startIndex, stopIndex + 1));
    render(visibleItemList, virtualScroller);
  });

  virtualScroller.init(items.length, getItemHeight);
}
