import './components/spa-scroll.js';
import './components/spa-textbox.js';
import {decode, DecodeError} from './codec.js';
import * as i18n from './i18n.js';

export default function(root) {
  const inp = root.getElementById('in');
  const out = root.getElementById('out');

  inp.addEventListener('input', e => {
    substMorse(inp.area);
    out.replaceChildren(...markErrors(decode(inp.value)));
  });

  return {};
}

function* markErrors(iter) {
  for(const item of iter) {
    if(item instanceof DecodeError) {
      const span = document.createElement('span');
      span.className = 'err';
      span.textContent = item;
      yield span;
    } else
      yield item;
  }
}

const reMorseFix = /([\uF008-\uF00A]*)([.\/-]+)$/;
const morseRepls = { '.': '\uF008', '-': '\uF009', '/': '\uF00A' };

function substMorse(area) {
  const pos = area.selectionStart;
  if(pos === 0 || area.selectionEnd !== pos)
    return;
  const str = area.value.substring(0, pos);
  const last = str[pos - 1];
  if(last !== '.' && last !== '-' && last !== '/')
    return;
  const m = reMorseFix.exec(str);
  if(!m)
    return;
  if(m[1].length > 0 || m[2].length > 3 || (m[2].length === 3 && m[2].slice(-3) !== '...')) {
    const sPre = str.substring(0, pos - m[2].length);
    const sMid = m[2].replace(/[.\/-]/g, c => morseRepls[c]);
    const sPost = area.value.substring(pos);
    area.value = sPre + sMid + sPost;
    area.selectionStart = area.selectionEnd = pos;
  }
}
