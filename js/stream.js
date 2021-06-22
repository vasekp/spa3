import './components/spa-scroll.js';
import './components/spa-textbox.js';
import _, * as i18n from './i18n.js';

const worker = new Worker('./js/stream-worker.js', {type: 'module'});

export default function(root) {
  const textbox = root.getElementById('in');
  textbox.addEventListener('input', e =>
    worker.postMessage({cmd: 'parse', input: textbox.value}));
  textbox.addEventListener('tb-submit', e =>
    worker.postMessage({cmd: 'exec', input: textbox.value}));

  const errbox = root.getElementById('error');
  worker.addEventListener('message', e => {
    if(e.data.type === 'ok') {
      textbox.mark();
      errbox.hidden = true;
      if(e.data.cmd === 'exec') {
        const div = document.createElement('div');
        const dIn = document.createElement('div');
        dIn.classList.add('input');
        dIn.textContent = e.data.input;
        const dOut = document.createElement('div');
        dOut.classList.add('output');
        dOut.textContent = e.data.output;
        div.append(dIn, dOut);
        root.getElementById('hist').prepend(div);
      }
    } else {
      textbox.mark(e.data.pos, e.data.len);
      if(e.data.cmd === 'exec') {
        errbox.textContent = e.data.msg;
        errbox.hidden = false;
      } else
        errbox.hidden = true;
    };
  });
  return {};
}
