
/* eslint-disable */

import React, { useRef, useEffect, useState } from 'react';

const getItemLength = (index) => index % 2 === 0 ? 50 : 100;

const listItems = Array.from(Array(1000).keys()).map((index) => ({
  id: index,
  height: getItemLength(index),
  width: getItemLength(index),
}));

const listStyles = {
  display: 'flex',
  border: '1px solid black',
};

const listItemStyles = {
  flexShrink: 0,
  backgroundColor: 'lightgray'
};

export function VerticalList() {
  const [items, setItems] = useState([]);
  const listRef = useRef(null);

  useEffect(() => {
    if (!listRef?.current) {
      return;
    }

    listRef.current.addEventListener('visible-range-change', ({ detail: { startIndex, stopIndex } }) => {
      console.log('visibleRangeChange', startIndex, stopIndex);
      if (!startIndex && !stopIndex) {
        setItems([]);
      } else {
        setItems(listItems.slice(startIndex, stopIndex + 1));
      }
    });

    listRef.current.enableResizeObserver = true;
    listRef.current.init(listItems.length, getItemLength);
  }, []);

  return (
    <virtual-scroller
      ref={listRef}
      style={{
        ...listStyles,
        flexDirection: 'column',
        border: '1px solid black',
        width: 402,
        height: 402,
      }}
      >
      {items.map((item) =>
        <div
          key={item.id}
          style={{
            ...listItemStyles,
            height: item.height,
            borderBottom: '1px solid black',
          }}
        >{item.id}
      </div>
    )}
    </virtual-scroller>
  );
}

export function HorizontalList() {
  const [items, setItems] = useState([]);
  const listRef = useRef(null);

  useEffect(() => {
    if (!listRef?.current) {
      return;
    }

    listRef.current.addEventListener('visible-range-change', ({ detail: { startIndex, stopIndex } }) => {
      // console.log('horizontal visibleRangeChange', startIndex, stopIndex);
      setItems(listItems.slice(startIndex, stopIndex + 1));
    });

    listRef.current.init(listItems.length, getItemLength, {
      virtualization: 'horizontal'
    });
  }, []);

  return (
    <virtual-scroller
      ref={listRef}
      style={{
        ...listStyles,
        flexDirection: 'row',
        flexWrap: 'nowrap',
        width: 400,
        height: 100,
        marginTop: 40,
      }}
      >
      {items.map((item) =>
        <div
          key={item.id}
          style={{
            width: item.width,
            borderRight: '1px solid black',
            ...listItemStyles,
          }}
        >{item.id}
        </div>
      )}
    </virtual-scroller>
  );
}