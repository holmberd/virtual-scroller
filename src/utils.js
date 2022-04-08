export function debounce(callback, delay, leading = true) {
  let start = Date.now();

  return (...args) => {
    if (leading) {
      leading = false;
      callback(...args);
    }
    if (Date.now() - start >= delay) {
      callback(...args);
    } else {
      start = Date.now();
    }
  }
}

