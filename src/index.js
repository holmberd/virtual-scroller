import { html, render } from 'lit-html';
import { repeat } from 'lit-html/directives/repeat.js';

export { default } from './virtual-scroller';

// const testButton = document.querySelector('#test-button');
const virtualScroller = document.querySelector('virtual-scroller');

const items = Array(10000).fill(true).map((_, index) => ({ id: index }));

const itemList = (items) => html`
  ${repeat(items, (item) => item.id, (item, index) => html`
    <div class='row'>${item.id}</div>
  `)}
`;

virtualScroller.addEventListener('visibleRangeChange', ({ detail: { startIndex, stopIndex } }) => {
  console.log('visibleRangeChange', startIndex, stopIndex);
  const visibleItemList = itemList(items.slice(startIndex, stopIndex + 1));
  render(visibleItemList, virtualScroller);
});

virtualScroller.rowCount = items.length;
virtualScroller.setRowHeightCalculator((index) => 60);

// viewElement.setRowFactory((index) => {
//   const rowDiv = document.createElement('div');
//   rowDiv.classList = 'row';
//   rowDiv.id = index;
//   rowDiv.textContent = `row-${index}`;
//   return rowDiv;
// });

// viewElement.render();

//let prevRange = [0, 0];

// viewElement.addEventListener('visibleRangeChange', ({ detail: { startIndex, stopIndex } }) => {
//   console.log('visibleRangeChange', startIndex, stopIndex);

//   let newStartIndex = 0;
//   let newStopIndex = 0;
//   const [prevStartIndex, prevStopIndex] = prevRange;

//   if (!prevStartIndex && !prevStopIndex) {
//     newStartIndex = startIndex;
//     newStopIndex = stopIndex;
//   } else if (startIndex < prevStartIndex) {
//     newStartIndex = startIndex;
//     newStopIndex = prevStopIndex - 1;
//   } else if (stopIndex > prevStopIndex) {
//     newStartIndex = prevStopIndex + 1;
//     newStopIndex = stopIndex;
//   }

//   prevRange = [startIndex, stopIndex];

//   if (!newStartIndex && !newStopIndex) {
//     return;
//   }

//   let fragment = document.createDocumentFragment();
//   for (let i = newStartIndex; i <= newStopIndex; i++) {
//     const rowDiv = document.createElement('div');
//     rowDiv.classList = 'row';
//     rowDiv.textContent = `row-${i}`;
//     fragment.appendChild(rowDiv);
//   }

//   viewElement.appendChild(fragment);
//   fragment = null;
// })


// testButton.addEventListener('click', () => {
//   const div = document.createElement('div');
//   div.textContent = 'inserted row';
//   viewElement.appendChild(div);
// });
