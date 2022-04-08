export function throttle(fn, wait) {
  var time = Date.now();
  return function () {
    if ((time + wait - Date.now()) < 0) {
      fn();
      time = Date.now();
    }
  }
}

export function debounce(callback, delay, leading = true) {
  let start = now();

  return (...args) => {
    if (leading) {
      leading = false;
      callback(...args);
    }
    if (now() - start >= delay) {
      callback(...args);
    } else {
      start = now();
    }
  }
}

/*

function throttle(fn, wait) {
  let lastFn, lastRan;
  return (...args) => {
    if (!lastRan) {
      fn(...args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(() => {
        if ((Date.now() - lastRan) >= wait) {
          fn(...args);
          lastRan = Date.now();
        }
      }, wait - (Date.now() - lastRan));
    }
  }
}
*/
