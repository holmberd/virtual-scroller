export function debounce(callback, wait, leading = true) {
  let timeoutId = null;
  return (...args) => {
    if (leading) {
      leading = false;
      callback(...args);
      return;
    }
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      callback(...args);
    }, wait);
  };
}
