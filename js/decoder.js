import './components/spa-scroll.js';
import './components/spa-textbox.js';
import * as i18n from './i18n.js';

export default function(root) {
  const inp = root.getElementById('in');
  const out = root.getElementById('out');

  inp.addEventListener('input', e => {
    out.replaceChildren(...decode(inp.value));
  });

  return {};
}

function* decode(str) {
  let lastFunc = null;
  let state = {};
  for(const ch of str) {
    const c = ch.codePointAt(0);
    const [func, base] = category(c);
    if(func !== lastFunc) {
      if(lastFunc && Object.keys(state).length > 0)
        yield lastFunc(null, null, state);
      state = {};
    }
    if(!func) {
      lastFunc = null;
      yield ch;
    } else {
      lastFunc = func;
      const ret = func(c - base, ch, state);
      yield ret !== null ? ret : markError(ch);
    }
  }
  if(lastFunc && Object.keys(state).length > 0)
    yield lastFunc(null, null, state);
}

function category(c) {
  for(const [start, end, func] of map)
    if(c <= end)
      return [func, start];
  /* else */
  return [];
}

function markError(ch) {
  const span = document.createElement('span');
  span.className = 'err';
  span.textContent = ch;
  return span;
}

function braille(c) {
  const letters = [1, 3, 9, 25, 17, 11, 27, 19, 10, 26, 5, 7, 13, 29, 21, 15, 31, 23, 14, 30, 37, 39, 55, 45, 61, 53];
  const i = letters.indexOf(c);
  return i >= 0 ? String.fromCharCode(0x41 + i) : null;
}

function morse(c, ch, state) {
  const letters = [12, 2111, 2121, 211, 1, 1121, 221, 1111, 11, 1222, 212, 1211, 22, 21, 222, 1221, 2212, 121, 111, 2, 112, 1112, 122, 2112, 2122, 2211];
  if(c === 2 || c === null) {
    if(!state.x)
      return ' ';
    /* else */
    const i = letters.indexOf(state.x);
    state.in = (state.in || '') + (ch || '');
    const ret = i >= 0 ? String.fromCharCode(0x41 + i) : markError(state.in);
    state.x = 0;
    state.in = '';
    return ret;
  } else {
    state.x = 10 * (state.x || 0) + c + 1;
    state.in = (state.in || '') + ch;
    return '';
  }
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
  [0xF008, morse],
  [0xF00B, null],
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
