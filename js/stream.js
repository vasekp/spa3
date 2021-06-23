import './components/spa-scroll.js';
import './components/spa-textbox.js';
import _, * as i18n from './i18n.js';

const iface = (() => {
  let support = false;
  const opts = {
    get type() {
      support = true;
      return 'module';
    }
  };
  new Worker('data:', opts).terminate();

  if(support) {
    console.log('Worker');
    const worker = new Worker('./js/stream-worker.js', opts);
    return msg => new Promise(resolve => {
      worker.postMessage(msg);
      worker.addEventListener('message', e => resolve(e.data), {once: true});
    });
  } else {
    console.log('Sync');
    const impPromise = import('./stream-worker.js');
    return msg => impPromise.then(imp => imp.exec(msg));
  }
})();

export default function(root) {
  const textbox = root.getElementById('in');
  const errbox = root.getElementById('error');

  function result(data) {
    if(data.type === 'ok') {
      textbox.mark();
      errbox.hidden = true;
      if(data.cmd === 'exec') {
        const div = document.createElement('div');
        const dIn = document.createElement('div');
        dIn.classList.add('input');
        dIn.textContent = data.input;
        const dOut = document.createElement('div');
        dOut.classList.add('output');
        dOut.textContent = data.output;
        div.append(dIn, dOut);
        root.getElementById('hist').prepend(div);
      }
    } else {
      textbox.mark(data.pos, data.len);
      if(data.cmd === 'exec') {
        errbox.children[0].textContent = data.input;
        errbox.children[1].textContent = data.msg;
        errbox.hidden = false;
      } else
        errbox.hidden = true;
    };
  }

  textbox.addEventListener('input', e =>
    iface({cmd: 'parse', input: textbox.value}).then(result));
  textbox.addEventListener('tb-submit', e =>
    iface({cmd: 'exec', input: textbox.value}).then(result));
  return {};
}
