import React, { useRef, useEffect, useState } from 'react';

const getItemHeight = (index) => index % 2 === 0 ? 50 : 100;

const listItems = Array.from(Array(1000).keys()).map((index) => ({
  id: index,
  height: getItemHeight(index),
}));

export default function List() {
  const [items, setItems] = useState(listItems);
  const listRef = useRef(null);

  useEffect(() => {
    if (!listRef?.current) {
      return;
    }

    console.log(listRef.current);

    listRef.current.addEventListener('visible-range-change', ({ detail: { startIndex, stopIndex } }) => {
      // console.log('visibleRangeChange', startIndex, stopIndex);
      setItems(items.slice(startIndex, stopIndex + 1));
    });

    listRef.current.init(items.length, getItemHeight);
  }, []);

  return (
    <virtual-scroller ref={listRef} style={{ border: '1px solid black'}} onChange={() => console.log('test')}>
      {items.map((item) =>
        <div key={item.id} style={{ height: item.height, borderBottom: '1px solid black' }}>{item.id}</div>)}
    </virtual-scroller>
  );
}