/**
 * @jest-environment jsdom
 */

export { default } from '../virtual-scroller';

describe('virtual-scroller vertical scrolling', () => {
  it('should render', () => {
    document.body.innerHTML = `
      <virtual-scroller></virtual-scroller>
    `;

    expect(document.body).toContainElement('virtual-scroller');
    expect(document.querySelector('virtual-scroller')).toBeTruthy();
  });
});
