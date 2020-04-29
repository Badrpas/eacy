

function saveToCache(msg) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('lastLog', msg);
  }
}


if (typeof localStorage !== 'undefined') {
  const msg = localStorage.getItem('lastLog');
  if (msg) {
    console.warn('Last message before reload:\n', msg);
    localStorage.removeItem('lastLog');
  }
}
const _warn = console.warn;

console.warn = function (...args) {
  saveToCache(...args);
  return _warn.apply(console, args);
};