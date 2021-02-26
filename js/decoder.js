import './components/spa-scroll.js';
import './components/spa-textbox.js';
import * as i18n from './i18n.js';

export default function(root) {
  const inp = root.getElementById('in');
  const out = root.getElementById('out');
  inp.addEventListener('input', e => {
    out.value = inp.value.split('').map(decode).join('');
  });

  return {};
}

function decode(ch) {
  const c = ch.codePointAt(0);
  const [func, base] = category(c);
  if(!func)
    return ch;
  else
    return func(c - base) || ch;
}

function category(c) {
  for(const [start, end, func] of map)
    if(c <= end)
      return [func, start];
  /* else */
  return [];
}

function braille(c) {
  const letters = [1, 3, 9, 25, 17, 11, 27, 19, 10, 26, 5, 7, 13, 29, 21, 15, 31, 23, 14, 30, 37, 39, 55, 45, 61, 53];
  const i = letters.indexOf(c);
  return i >= 0 ? String.fromCharCode(0x41 + i) : null;
}

function pigpen1(c) {
  return c < 26 ? String.fromCharCode(0x41 + c) : null;
}

function pigpen2(c) {
  const [xy, z] = [c >> 1, c & 1];
  const [x, y] = xy < 9 ? [0, xy] : [1, xy - 9];
  const a = x * 18 + z * (x ? 4 : 9) + y;
  return a < 26 ? String.fromCharCode(0x41 + a) : null;
}

function pigpen3(c) {
  const [xy, z] = [Math.trunc(c / 3), c % 3];
  const a = z * 9 + xy;
  return a < 26 ? String.fromCharCode(0x41 + a) : null;
}

function polybius(c) {
  return c < 26 ? String.fromCharCode(0x41 + c) : null;
}

function segments(c) {
  const digits = [0b0111111, 0b0000110, 0b1011011, 0b1001111, 0b1100110, 0b1101101, 0b1111101, 0b0000111, 0b1111111, 0b1101111];
  const letters = [0b1110111, 0b1111100, 0b1011000, 0b1011110, 0b1111001, 0b1110001, 0b0111101, 0b1110100, 0b0110000, 0b0011110, 0b1110101, 0b0111000, 0b0110111, 0b1010100, 0b1011100, 0b1110011, 0b1100111, 0b1010000, 0b1101101, 0b1111000, 0b0011100, 0b0111110, 0b1111110, 0b1110110, 0b1101110, 0b1011011]; /* S = 5, Z = 2 */
  let i = digits.indexOf(c);
  if(i >= 0)
    return String.fromCharCode(0x30 + i);
  i = letters.indexOf(c);
  if(i >= 0)
    return String.fromCharCode(0x41 + i);
  /* else */
  return null;
}

function flags(c) {
  return (c >= 1 && c <= 26) ? String.fromCharCode(0x40 + c) : null;
}

function semaphore(c) {
  const letters = [1, 2, 3, 4, 5, 6, 7, 10, 11, 38, 12, 13, 14, 15, 19, 20, 21, 22, 23, 28, 29, 39, 46, 47, 30, 55];
  const i = letters.indexOf(c);
  return i >= 0 ? String.fromCharCode(0x41 + i) : null;
}

const map = [
  [0x2800, braille],
  [0x2840, null],
  [0xF100, pigpen1],
  [0xF120, pigpen2],
  [0xF140, pigpen3],
  [0xF160, polybius],
  [0xF180, segments],
  [0xF200, null],
  [0xF800, flags],
  [0xF820, null],
  [0xF880, semaphore],
  [0xF8C0, null]
].reduce((() => {
  let lastFunc = null;
  let lastStart = 0;
  return (acc, [start, func]) => {
    acc.push([lastStart, start - 1, lastFunc]);
    [lastStart, lastFunc] = [start, func];
    return acc;
  };
})(), []);
