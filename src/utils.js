export function throttle(fn, wait) {
  var time = Date.now();
  return function () {
    if ((time + wait - Date.now()) < 0) {
      fn();
      time = Date.now();
    }
  }
}

/**
 * Binary search.
 */
export function bSearch(array, pred, start = -1) {
  let end = array.length;
  while (start + 1 < end) {
    const mid = start + ((end - start) >> 1);
    if (pred(array[mid])) {
      end = mid;
    } else {
      start = mid;
    }
  }
  return end;
}
