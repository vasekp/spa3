export function debounce(f, delay) {
  let timer = null;
  return arg => {
    clearTimeout(timer);
    timer = setTimeout(() => f(arg), delay);
  }
}
