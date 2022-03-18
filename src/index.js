export { default } from './view-element';

// const testButton = document.querySelector('#test-button');
const viewElement = document.querySelector('view-element');

viewElement.rowCount = 1000;

viewElement.addEventListener('visibleRangeChange', ({ detail: { startIndex, stopIndex } }) => {
  console.log('visibleRangeChange', startIndex, stopIndex);

  let fragment = document.createDocumentFragment();
  for (let i = startIndex; i <= stopIndex; i++) {
    const rowDiv = option = document.createElement('div');
    rowDiv.classList = 'row';
    rowDiv.textContent = `row-${i}`;
    fragment.appendChild(rowDiv);
  }

  viewElement.appendChild(fragment);
  fragment = null;
})

const rowHeightCalculator = (index) => 60;
viewElement.setRowHeightCalculator(rowHeightCalculator);


// testButton.addEventListener('click', () => {
//   const div = document.createElement('div');
//   div.textContent = 'inserted row';
//   viewElement.appendChild(div);
// });
